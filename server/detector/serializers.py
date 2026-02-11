from rest_framework import serializers
from .models import Users, Companies, AnalysisComments
from django.contrib.auth.hashers import make_password
from django.db import transaction

# 사용자 목록 조회용
class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Users
        fields = ['id', 'email', 'name', 'role', 'dept_name', 'created_at']

# 권한 변경용
class UserRoleUpdateSerializer(serializers.Serializer):
    target_user_id = serializers.IntegerField()
    new_role = serializers.ChoiceField(choices=['DIRECTOR', 'MANAGER', 'STAFF'])

    def update_role(self, admin_user, target_user_id, new_role):
        try:
            # 대상 사용자 조회
            target_user = Users.objects.get(id=target_user_id)
            
            # 같은 법인 소속인지 확인
            if target_user.company_id != admin_user.company_id:
                return False, "해당 사용자는 동일한 법인 소속이 아닙니다."
            
            # 권한 업데이트
            target_user.role = new_role
            target_user.save()
            return True, "권한이 성공적으로 변경되었습니다."
        except Users.DoesNotExist:
            return False, "존재하지 않는 사용자입니다."

class CompanyUserRegistrationSerializer(serializers.Serializer):
    corporate_name = serializers.CharField(max_length=100)
    email = serializers.EmailField(max_length=255)
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=['DIRECTOR', 'MANAGER', 'STAFF'])
    dept_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    name = serializers.CharField(max_length=50)

    def validate_email(self, value):
        if Users.objects.filter(email=value).exists():
            raise serializers.ValidationError("이미 사용 중인 이메일입니다.")
        return value

    def create(self, validated_data):
        corporate_name = validated_data['corporate_name']
        role = validated_data['role']
        
        with transaction.atomic():
            # 1. 법인 존재 여부 확인
            company = Companies.objects.filter(corporate_name=corporate_name).first()

            if not company:
                # 법인이 없는데 STAFF로 가입하려는 경우 거부
                if role == 'STAFF':
                    raise serializers.ValidationError({
                        "corporate_name": "등록되지 않은 법인명입니다. STAFF는 신규 법인을 등록할 수 없습니다."
                    })
                
                # 법인이 없으므로 신규 등록 (DIRECTOR, MANAGER만 가능)
                company = Companies.objects.create(
                    corporate_name=corporate_name,
                    owner_id=0  # 유저 생성 후 업데이트
                )
                is_new_company = True
            else:
                # 이미 등록된 법인명임을 알리고 싶을 때 처리
                # (기존 법인에 소속되는 프로세스라면 그대로 진행)
                is_new_company = False

            # 2. 유저 생성 (사용자가 선택한 role 반영)
            hashed_password = make_password(validated_data['password'])
            user = Users.objects.create(
                company=company,
                email=validated_data['email'],
                password_hash=hashed_password,
                role=role,
                dept_name=validated_data.get('dept_name', ''),
                name=validated_data['name']
            )

            # 3. 신규 법인인 경우 책임자 업데이트
            if is_new_company:
                company.owner_id = user.id
                company.save()

            return user

# --- 댓글 관련 시리얼라이저 추가 ---
class AnalysisCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.name', read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = AnalysisComments
        fields = ['id', 'material', 'author', 'author_name', 'parent', 'content', 'replies', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_replies(self, obj):
        # 대댓글이 있는 경우만 재귀적으로 호출 (최상위 댓글인 경우에만 자식들을 가져옴)
        if obj.parent is None:
            serializer = AnalysisCommentSerializer(obj.replies.all(), many=True)
            return serializer.data
        return []