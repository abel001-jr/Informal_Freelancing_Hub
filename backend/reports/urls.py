from django.urls import path
from . import views

app_name = 'reports'

urlpatterns = [
    path('user/<int:user_id>/', views.report_user, name='report_user'),
    path('service/<int:service_id>/', views.report_service, name='report_service'),
]
