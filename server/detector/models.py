from django.db import models

class Companies(models.Model):
    id = models.AutoField(primary_key=True)
    corporate_name = models.CharField(max_length=100)
    owner_id = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'companies'  # 소문자 확인
        managed = False

class Users(models.Model):
    ROLE_CHOICES = [
        ('DIRECTOR', 'Director'),
        ('MANAGER', 'Manager'),
        ('STAFF', 'Staff'),
    ]

    id = models.AutoField(primary_key=True)
    # db_column을 명시적으로 'company_id'로 지정 (DB 생성 시 소문자로 생성되었을 확률 100%)
    company = models.ForeignKey(Companies, on_delete=models.CASCADE, db_column='company_id')
    email = models.EmailField(max_length=255, unique=True)
    password_hash = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    dept_name = models.CharField(max_length=100, blank=True, null=True)
    name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users'  # 소문자 확인
        managed = False

class PcbProjects(models.Model):
    # status에 사용할 상수 정의
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('REVIEWED', 'Reviewed'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
    ]

    id = models.AutoField(primary_key=True)
    # Companies 모델과 연결 (이미 존재한다고 가정)
    company = models.ForeignKey('Companies', on_delete=models.CASCADE, db_column='company_id')
    model_name = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='PENDING'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'pcb_projects'


class AnalysisMaterials(models.Model):
    id = models.AutoField(primary_key=True)
    # pcb_projects 테이블을 참조하는 외래키
    project = models.ForeignKey(
        'PcbProjects', 
        on_delete=models.CASCADE, 
        db_column='project_id'
    )
    # users 테이블을 참조하는 외래키 (업로드한 실무자)
    author = models.ForeignKey(
        'Users', 
        on_delete=models.SET_NULL, 
        db_column='author_id', 
        null=True
    )
    # 이미지 및 자료 경로
    defect_image_url = models.TextField(blank=True, null=True)
    performance_data_url = models.TextField(blank=True, null=True)
    # 특이사항 메모
    description = models.TextField(blank=True, null=True)
    # 생성 시간 (자동 기록)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'analysis_materials'
        managed = False  # DB에서 직접 테이블을 관리하므로 False 설정

    def __str__(self):
        return f"Material {self.id} for Project {self.project_id}"