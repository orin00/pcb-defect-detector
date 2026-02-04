from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('detector.urls')), 
]

# /volume/ 주소로 요청이 오면 D:\final_project\volume 폴더를 뒤지겠다는 선언
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)