from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from .views import DetectView, CompanySignUpView, CompanyMemberManagementView, LoginView, LogoutView, UserUpdateView, ProjectView, ProjectUploadView, AnalysisMaterialListView, DownloadPerformanceDataView, ProjectStatusUpdateView

urlpatterns = [
    path('detect/', DetectView.as_view(), name='pcb_detect'),
    path('upload-result/', ProjectUploadView.as_view(), name='pcb_upload'),
    path('signup/', CompanySignUpView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('update-profile/', UserUpdateView.as_view(), name='update_profile'),
    path('projects/', ProjectView.as_view(), name='projects'),
    path('projects/status/', ProjectStatusUpdateView.as_view(), name='project_status_update'),
    path('analysis-materials/', AnalysisMaterialListView.as_view(), name='analysis_materials_list'),
    path('download-performance/', DownloadPerformanceDataView.as_view(), name='download_performance'),
    path('company/members/', CompanyMemberManagementView.as_view(), name='company_members'),
]

# [중요] 개발 환경에서 MEDIA 파일을 서빙할 수 있도록 경로 추가
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)