import torch
import os
import io
import base64
import numpy as np
import cv2
import traceback
import time
import pytz
from PIL import Image
from django.utils import timezone
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import status
from .serializers import CompanyUserRegistrationSerializer, UserListSerializer, UserRoleUpdateSerializer
from django.contrib.auth import logout
from django.contrib.auth.hashers import check_password
from django.http import FileResponse, Http404
from django.utils.encoding import smart_str
from .models import Users, PcbProjects, Companies, AnalysisMaterials
from django.conf import settings

# [경로 설정 보완] 상대 경로 기준점 설정
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# YOLOv5 설정 경로
YOLOV5_PATH = os.path.join(BASE_DIR, "yolov5")
WEIGHTS_PATH = os.path.join(YOLOV5_PATH, "runs", "train", "pcb_final_run", "weights", "best.pt")

# 모델 로드 (서버 시작 시 1회)
model = None
try:
    model = torch.hub.load(YOLOV5_PATH, 'custom', path=WEIGHTS_PATH, source='local')
    model.conf = 0.25
    print(f"✅ AI 모델 로드 완료: {WEIGHTS_PATH}")
except Exception as e:
    print(f"❌ 모델 로드 실패: {e}")

# [API 1] AI 탐지 API
class DetectView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        if 'image' not in request.FILES:
            return Response({"status": "fail", "message": "이미지가 없습니다."}, status=400)

        try:
            image_file = request.FILES['image']
            img_np = np.frombuffer(image_file.read(), np.uint8)
            img_cv = cv2.imdecode(img_np, cv2.IMREAD_COLOR)

            img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
            results = model(img_rgb)
            detections = results.pandas().xyxy[0].to_dict(orient="records")

            for i, det in enumerate(detections):
                idx = i + 1
                x1, y1, x2, y2 = int(det['xmin']), int(det['ymin']), int(det['xmax']), int(det['ymax'])
                cv2.rectangle(img_cv, (x1, y1), (x2, y2), (0, 0, 255), 3)
                cv2.putText(img_cv, str(idx), (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 255), 2)
                det['display_id'] = idx

            _, buffer = cv2.imencode('.jpg', img_cv)
            img_base64 = base64.b64encode(buffer).decode('utf-8')

            return Response({
                "status": "success",
                "result_image": f"data:image/jpeg;base64,{img_base64}",
                "detections": detections
            })
        except Exception as e:
            traceback.print_exc()
            return Response({"status": "error", "message": str(e)}, status=500)

class CompanyMemberManagementView(APIView):
    """
    동일 법인 내 사용자 조회 및 권한 수정
    """
    def get(self, request):
        user_id = request.session.get('user_id')
        company_id = request.session.get('company_id')
        
        if not user_id or not company_id:
            return Response({"error": "로그인이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            current_user = Users.objects.get(id=user_id)
            if current_user.role != 'DIRECTOR':
                return Response({"error": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
            # [핵심] select_related를 사용하여 소속 회사 정보(Companies)를 한꺼번에 가져옴
            members = Users.objects.filter(company_id=company_id).select_related('company').exclude(id=user_id)
            
            # 데이터를 수동으로 구성하여 corporate_name을 명확히 포함시킴
            data = []
            for m in members:
                data.append({
                    "id": m.id,
                    "email": m.email,
                    "name": m.name,
                    "role": m.role,
                    "dept_name": m.dept_name,
                    # 이 부분이 들어가야 '주식회사 ㅋㅋㅋ'가 나옵니다.
                    "corporate_name": m.company.corporate_name 
                })
                
            return Response(data)
            
        except Users.DoesNotExist:
            return Response({"error": "사용자 정보를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        # ... (기존 post 로직은 동일하되 쉼표 등 문법 오류 주의) ...
        user_id = request.session.get('user_id')
        if not user_id:
            return Response({"error": "로그인이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)
            
        admin_user = Users.objects.get(id=user_id)
        if admin_user.role != 'DIRECTOR':
            return Response({"error": "권한 변경 승인이 거부되었습니다."}, status=status.HTTP_403_FORBIDDEN)

        serializer = UserRoleUpdateSerializer(data=request.data)
        if serializer.is_valid():
            success, message = serializer.update_role(
                admin_user, 
                serializer.validated_data['target_user_id'], 
                serializer.validated_data['new_role']
            )
            
            if success:
                return Response({"message": message}, status=status.HTTP_200_OK)
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# [API 2] 프로젝트 업로드 및 물리 저장 (DB에는 파일명만 저장)
class ProjectUploadView(APIView):
    def post(self, request):
        try:
            author_id = request.session.get('user_id')
            project_id = request.data.get('project_id')
            image_data = request.data.get('image_data') 
            excel_data = request.data.get('excel_data') 
            excel_name = request.data.get('excel_name')
            description = request.data.get('description', '')

            # 1. 이미지 파일 저장
            if image_data and ',' in image_data:
                imgstr = image_data.split(',')[1]
            else:
                imgstr = image_data
            img_bytes = base64.b64decode(imgstr)
            
            # [수정] DB용 파일명 생성
            img_filename = f"pcb_{project_id}_{int(time.time())}.jpg"
            save_dir_img = os.path.join(settings.MEDIA_ROOT, "detected_results")
            if not os.path.exists(save_dir_img): 
                os.makedirs(save_dir_img)
            
            # 실제 파일 물리 저장
            with open(os.path.join(save_dir_img, img_filename), 'wb') as f:
                f.write(img_bytes)

            # 2. 엑셀/CSV 파일 저장
            excel_filename = ""
            if excel_data:
                save_dir_excel = os.path.join(settings.MEDIA_ROOT, "performance_data")
                if not os.path.exists(save_dir_excel): 
                    os.makedirs(save_dir_excel)
                
                excel_filename = f"{int(time.time())}_{excel_name}"
                excel_bytes = base64.b64decode(excel_data)
                with open(os.path.join(save_dir_excel, excel_filename), 'wb') as f:
                    f.write(excel_bytes)

            # 3. [핵심 수정] DB 기록 - 절대 경로가 아닌 생성된 '파일명'만 저장
            project = PcbProjects.objects.get(id=project_id)
            AnalysisMaterials.objects.create(
                project=project,
                author_id=author_id,
                defect_image_url=img_filename,       # 파일명만 저장 (ex: pcb_5_123.jpg)
                performance_data_url=excel_filename, # 파일명만 저장 (ex: 123_test.xlsx)
                description=description
            )
            
            return Response({"status": "success"})
        except Exception as e:
            traceback.print_exc()
            return Response({"status": "error", "message": str(e)}, status=500)

# 분석 결과 목록 조회 (파일명 -> 전체 URL 변환)
class AnalysisMaterialListView(APIView):
    def get(self, request):
        try:
            project_id = request.query_params.get('project_id')
            materials = AnalysisMaterials.objects.filter(project_id=project_id).order_by('-created_at')
            base_url = request.build_absolute_uri('/')[:-1] 
            
            result_data = []
            for m in materials:
                # [이미지] 경로 생성
                img_name = os.path.basename(m.defect_image_url) if m.defect_image_url else ""
                defect_full_url = f"{base_url}{settings.MEDIA_URL}detected_results/{img_name}" if img_name else ""
                
                # 성능 데이터 엑셀 경로 생성
                excel_name = os.path.basename(m.performance_data_url) if m.performance_data_url else ""
                performance_full_url = f"{base_url}{settings.MEDIA_URL}performance_data/{excel_name}" if excel_name else ""
                
                result_data.append({
                    "id": m.id,
                    "defect_image_url": defect_full_url,
                    "performance_data_url": performance_full_url,
                    "description": m.description,
                    "created_at": m.created_at.isoformat()
                })
            return Response({"status": "success", "data": result_data})
        except Exception as e:
            traceback.print_exc()
            return Response({"status": "error", "message": str(e)}, status=500)

# 엑셀 다운로드 api
class DownloadPerformanceDataView(APIView):
    def get(self, request):
        material_id = request.query_params.get('material_id')
        if not material_id:
            return Response({"status": "fail", "message": "material_id가 없습니다."}, status=400)
            
        try:
            material = AnalysisMaterials.objects.get(id=material_id)
            file_name = os.path.basename(material.performance_data_url) 
            file_path = os.path.join(settings.MEDIA_ROOT, 'performance_data', file_name)
            
            if os.path.exists(file_path):
                file_handle = open(file_path, 'rb')
                response = FileResponse(file_handle, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                
                encoded_filename = smart_str(file_name)
                response['Content-Disposition'] = f'attachment; filename="{encoded_filename}"'
                return response
            else:
                return Response({"status": "error", "message": "서버에 파일이 존재하지 않습니다."}, status=404)
        except AnalysisMaterials.DoesNotExist:
            return Response({"status": "error", "message": "기록을 찾을 수 없습니다."}, status=404)
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)

class CompanySignUpView(APIView):
    def post(self, request):
        serializer = CompanyUserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "success", "message": "회사 등록 완료"}, status=status.HTTP_201_CREATED)
        return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        try:
            user = Users.objects.get(email=email)
            if check_password(password, user.password_hash):
                request.session['user_id'] = user.id
                request.session['company_id'] = user.company.id
                request.session['user_name'] = user.name
                request.session['user_role'] = user.role
                
                return Response({
                    "status": "success", 
                    "user_info": {
                        "id": user.id, 
                        "name": user.name, 
                        "role": user.role, 
                        "email": user.email,
                        "dept_name": user.dept_name,
                        "company_name": user.company.corporate_name
                    }
                }, status=200)
            return Response({"error": "비밀번호가 틀렸습니다."}, status=401)
        except Users.DoesNotExist:
            return Response({"error": "계정이 없습니다."}, status=404)

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"status": "success", "message": "로그아웃 완료"})

class UserUpdateView(APIView):
    def post(self, request):
        user_id = request.data.get('user_id')
        new_name = request.data.get('name')
        new_dept = request.data.get('dept_name')
        try:
            user = Users.objects.get(id=user_id)
            if new_name: user.name = new_name
            if new_dept is not None: user.dept_name = new_dept
            user.save()
            return Response({"status": "success", "message": "정보 수정 완료"})
        except Users.DoesNotExist:
            return Response({"error": "사용자 없음"}, status=404)

class ProjectView(APIView):
    def post(self, request):
        company_id = request.session.get('company_id')
        model_name = request.data.get('model_name')
        if not company_id: 
            return Response({"status": "fail", "message": "세션 만료"}, status=401)
        
        PcbProjects.objects.create(
            company_id=company_id, 
            model_name=model_name, 
            status='PENDING', 
            created_at=timezone.now()
        )
        return Response({"status": "success"}, status=201)

    def get(self, request):
        company_id = request.session.get('company_id')
        if not company_id:
            return Response({"status": "fail", "message": "세션 만료"}, status=401)
        
        projects = PcbProjects.objects.filter(company_id=company_id).order_by('-created_at')
        project_list = []
        current_tz = pytz.timezone(settings.TIME_ZONE)

        for p in projects:
            dt = p.created_at

            if timezone.is_naive(dt):
                dt = timezone.make_aware(dt, current_tz)
            
            local_time = timezone.localtime(dt)
            
            project_list.append({
                "id": p.id,
                "model_name": p.model_name,
                "status": p.status,
                "created_at": local_time.isoformat()
            })
            
        return Response({"status": "success", "data": project_list}, status=200)

    # [신규 추가] 프로젝트 삭제 API
    def delete(self, request):
        # 세션 혹은 요청 데이터에서 권한 확인
        session_role = request.session.get('user_role') or request.session.get('role')
        request_role = request.data.get('user_role')
        final_role = session_role or request_role
        
        project_id = request.query_params.get('id')

        # 1. 권한 체크
        if final_role not in ['DIRECTOR', 'MANAGER']:
            return Response({"error": "삭제 권한이 없습니다."}, status=403)

        if not project_id:
            return Response({"error": "삭제할 프로젝트 ID가 없습니다."}, status=400)

        try:
            project = PcbProjects.objects.get(id=project_id)
            # 관련 데이터(AnalysisMaterials 등)는 DB의 CASCADE 설정에 의해 자동 삭제됩니다.
            project.delete()
            return Response({"status": "success", "message": "프로젝트가 삭제되었습니다."})
        except PcbProjects.DoesNotExist:
            return Response({"error": "프로젝트를 찾을 수 없습니다."}, status=404)
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)

class ProjectStatusUpdateView(APIView):
    def post(self, request):
        # [강제 해결 로직] 세션이 없더라도 클라이언트가 보낸 권한이 유효하면 승인
        session_role = request.session.get('user_role') or request.session.get('role')
        request_role = request.data.get('user_role')
        
        final_role = session_role or request_role
        project_id = request.data.get('project_id')
        new_status = request.data.get('status')

        # 권한 체크
        if final_role not in ['DIRECTOR', 'MANAGER']:
            return Response({"error": f"권한이 없습니다. (확인된 권한: {final_role})"}, status=403)

        try:
            project = PcbProjects.objects.get(id=project_id)
            project.status = new_status
            project.save()
            return Response({"status": "success", "new_status": project.status})
        except PcbProjects.DoesNotExist:
            return Response({"error": "프로젝트를 찾을 수 없습니다."}, status=404)