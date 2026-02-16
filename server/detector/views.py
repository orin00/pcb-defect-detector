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
from .serializers import CompanyUserRegistrationSerializer, UserListSerializer, UserRoleUpdateSerializer, AnalysisCommentSerializer
from django.contrib.auth import logout
from django.contrib.auth.hashers import check_password
from django.http import FileResponse, Http404
from django.utils.encoding import smart_str
from .models import Users, PcbProjects, Companies, AnalysisMaterials, AnalysisComments
from django.conf import settings

# 상대 경로 기준점 설정
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

# AI 결함 탐지 api
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

class AnalysisCommentView(APIView):
    def get(self, request):
        material_id = request.query_params.get('material_id')
        if not material_id:
            return Response({"error": "material_id가 필요합니다."}, status=400)
        
        # 부모 댓글만 조회하면 시리얼라이저가 대댓글을 트리구조로 가져옴
        comments = AnalysisComments.objects.filter(material_id=material_id, parent__isnull=True).order_by('created_at')
        serializer = AnalysisCommentSerializer(comments, many=True)
        return Response(serializer.data)

    def post(self, request):
        author_id = request.data.get('author_id') or request.session.get('user_id')
        if not author_id:
            return Response({"error": "로그인이 필요합니다."}, status=401)

        data = request.data.copy()
        data['author'] = author_id
        
        serializer = AnalysisCommentSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def delete(self, request):
        comment_id = request.data.get('comment_id')
        user_id = request.data.get('user_id')

        if not comment_id:
            return Response({"error": "삭제할 댓글 ID가 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            comment = AnalysisComments.objects.get(id=comment_id)
            
            # 본인 확인 - 작성자만 삭제 가능
            if comment.author_id != int(user_id):
                return Response({"error": "본인의 댓글만 삭제할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)

            # 대댓글이 있는 경우에도 CASCADE 설정때문에 같이 삭제됨
            comment.delete()
            return Response({"status": "success", "message": "댓글이 삭제되었습니다."})
            
        except AnalysisComments.DoesNotExist:
            return Response({"error": "존재하지 않는 댓글입니다."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CompanyMemberManagementView(APIView):
    def get(self, request):
        user_id = request.session.get('user_id')
        company_id = request.session.get('company_id')
        
        if not user_id or not company_id:
            return Response({"error": "로그인이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            current_user = Users.objects.get(id=user_id)
            if current_user.role != 'DIRECTOR':
                return Response({"error": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
            # select_related를 사용하여 소속 회사 정보(Companies)를 한꺼번에 가져옴
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
                    "corporate_name": m.company.corporate_name 
                })
                
            return Response(data)
            
        except Users.DoesNotExist:
            return Response({"error": "사용자 정보를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
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

# 프로젝트 업로드 및 물리 저장, 데이터베이스에는 파일 이름만 저장함ㅁ
class ProjectUploadView(APIView):
    def post(self, request):
        try:
            author_id = request.session.get('user_id')
            project_id = request.data.get('project_id')
            image_data = request.data.get('image_data') 
            excel_data = request.data.get('excel_data') 
            excel_name = request.data.get('excel_name')
            description = request.data.get('description', '')

            # 이미지 파일 저장
            if image_data and ',' in image_data:
                imgstr = image_data.split(',')[1]
            else:
                imgstr = image_data
            img_bytes = base64.b64decode(imgstr)
            
            # 데이터베이스에 저장될 파일명 생성하고
            img_filename = f"pcb_{project_id}_{int(time.time())}.jpg"
            save_dir_img = os.path.join(settings.MEDIA_ROOT, "detected_results")
            if not os.path.exists(save_dir_img): 
                os.makedirs(save_dir_img)
            
            # 실제 파일을 저장_volume\detected_results
            with open(os.path.join(save_dir_img, img_filename), 'wb') as f:
                f.write(img_bytes)

            # 엑셀/CSV 파일 저장_volume\performance_data
            excel_filename = ""
            if excel_data:
                save_dir_excel = os.path.join(settings.MEDIA_ROOT, "performance_data")
                if not os.path.exists(save_dir_excel): 
                    os.makedirs(save_dir_excel)
                
                excel_filename = f"{int(time.time())}_{excel_name}"
                excel_bytes = base64.b64decode(excel_data)
                with open(os.path.join(save_dir_excel, excel_filename), 'wb') as f:
                    f.write(excel_bytes)

            project = PcbProjects.objects.get(id=project_id)
            AnalysisMaterials.objects.create(
                project=project,
                author_id=author_id,
                defect_image_url=img_filename,
                performance_data_url=excel_filename,
                description=description
            )
            
            return Response({"status": "success"})
        except Exception as e:
            traceback.print_exc()
            return Response({"status": "error", "message": str(e)}, status=500)

# 분석 결과 목록 조회 
# 일단 파일명을 URL로 변환하게 구현은 해놨는데 문제생기면 나중에 손 볼 예정
class AnalysisMaterialListView(APIView):
    def get(self, request):
        try:
            project_id = request.query_params.get('project_id')
            materials = AnalysisMaterials.objects.filter(project_id=project_id).order_by('-created_at')
            base_url = request.build_absolute_uri('/')[:-1] 
            
            result_data = []
            for m in materials:
                img_name = os.path.basename(m.defect_image_url) if m.defect_image_url else ""
                defect_full_url = f"{base_url}{settings.MEDIA_URL}detected_results/{img_name}" if img_name else ""
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

    # 프로젝트 삭제 api
    def delete(self, request):
        # 1. 권한 확인 (기존 로직 유지)
        session_role = request.session.get('user_role') or request.session.get('role')
        # request.data가 비어있을 수 있으므로 .get() 사용 시 주의
        request_role = request.data.get('user_role') if isinstance(request.data, dict) else None
        final_role = session_role or request_role
        
        # 2. [수정 포인트] 프로젝트 ID 추출 로직 보완
        # 주피터나 앱에서 'id' 또는 'project_id' 중 무엇으로 보내든 읽을 수 있도록 수정합니다.
        # 또한 Query Params와 Body(data) 양쪽을 다 체크합니다.
        project_id = (
            request.query_params.get('id') or 
            request.query_params.get('project_id') or 
            (request.data.get('project_id') if isinstance(request.data, dict) else None) or
            (request.data.get('id') if isinstance(request.data, dict) else None)
        )

        # 3. 권한 체크 (정상 상태 확인)
        if final_role not in ['DIRECTOR', 'MANAGER']:
            return Response({"error": f"삭제 권한이 없습니다. (현재 권한: {final_role})"}, status=403)

        # 4. ID 검증
        if not project_id:
            # 400 에러 발생 지점: 여기서 명확하게 어떤 키값이 누락되었는지 알려주도록 수정
            return Response({"error": "삭제할 프로젝트 ID(id 또는 project_id)가 없습니다."}, status=400)

        try:
            project = PcbProjects.objects.get(id=project_id)
            project.delete()
            return Response({"status": "success", "message": "프로젝트가 삭제되었습니다."})
        except PcbProjects.DoesNotExist:
            return Response({"error": f"ID {project_id} 프로젝트를 찾을 수 없습니다."}, status=404)
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)

class ProjectStatusUpdateView(APIView):
    def post(self, request):
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