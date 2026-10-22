from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve
from django.http import JsonResponse


def api_info(request):
    return JsonResponse({'name': 'FreelanceHub API', 'api': '/api/', 'frontend': settings.FRONTEND_URL})


urlpatterns = [
    path('', api_info, name='home'),
    path('django-admin/', admin.site.urls),
    path('api/', include('api.urls')),
]

if settings.DEBUG:
    # Private project/message files are only served by authenticated API downloads.
    urlpatterns += [re_path(r'^media/(?P<path>(?:services|profile_pictures|categories)/.+)$', serve, {'document_root': settings.MEDIA_ROOT})]
