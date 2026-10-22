from django.urls import path
from . import views

app_name = 'projects'

urlpatterns = [
    path('request/<int:service_id>/', views.request_project, name='request_project'),
    path('client/', views.client_projects, name='client_projects'),
    path('freelancer/', views.freelancer_projects, name='freelancer_projects'),
    path('<int:pk>/', views.project_detail, name='project_detail'),
    path('<int:pk>/accept/', views.accept_project, name='accept'),
    path('<int:pk>/reject/', views.reject_project, name='reject'),
    path('<int:pk>/submit/', views.submit_project, name='submit'),
    path('<int:pk>/confirm/', views.confirm_completion, name='confirm'),
    path('<int:pk>/upload/', views.upload_attachment, name='upload_attachment'),
    path('<int:pk>/cancel/', views.cancel_project, name='cancel'),
]
