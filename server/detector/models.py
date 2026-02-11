from django.db import models

class Companies(models.Model):
    id = models.AutoField(primary_key=True)
    corporate_name = models.CharField(max_length=100)
    owner_id = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'companies'
        managed = False

class Users(models.Model):
    ROLE_CHOICES = [
        ('DIRECTOR', 'Director'),
        ('MANAGER', 'Manager'),
        ('STAFF', 'Staff'),
    ]

    id = models.AutoField(primary_key=True)
    company = models.ForeignKey(Companies, on_delete=models.CASCADE, db_column='company_id')
    email = models.EmailField(max_length=255, unique=True)
    password_hash = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    dept_name = models.CharField(max_length=100, blank=True, null=True)
    name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users'
        managed = False

class PcbProjects(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('REVIEWED', 'Reviewed'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
    ]

    id = models.AutoField(primary_key=True)
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
    project = models.ForeignKey(
        'PcbProjects', 
        on_delete=models.CASCADE, 
        db_column='project_id'
    )
    author = models.ForeignKey(
        'Users', 
        on_delete=models.SET_NULL, 
        db_column='author_id', 
        null=True
    )
    defect_image_url = models.TextField(blank=True, null=True)
    performance_data_url = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'analysis_materials'
        managed = False

    def __str__(self):
        return f"Material {self.id} for Project {self.project_id}"

class AnalysisComments(models.Model):
    id = models.AutoField(primary_key=True)
    material = models.ForeignKey(
        AnalysisMaterials, 
        on_delete=models.CASCADE, 
        db_column='material_id',
        related_name='comments'
    )
    author = models.ForeignKey(
        Users, 
        on_delete=models.CASCADE, 
        db_column='author_id'
    )
    # parent_id가 없으면 댓글, 있으면 대댓글
    parent = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        db_column='parent_id', 
        null=True, 
        blank=True,
        related_name='replies'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'analysis_comments'
        managed = True