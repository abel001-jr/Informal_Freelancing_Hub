from django.urls import path
from . import views

app_name = 'services'

urlpatterns = [
    path('', views.service_list, name='list'),
    path('create/', views.create_service, name='create'),
    path('<int:pk>/', views.service_detail, name='detail'),
    path('<int:pk>/edit/', views.edit_service, name='edit'),
    path('<int:pk>/delete/', views.delete_service, name='delete'),
]
