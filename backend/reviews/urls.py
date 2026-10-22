from django.urls import path
from . import views

app_name = 'reviews'

urlpatterns = [
    path('project/<int:project_id>/review/', views.create_review, name='create'),
]
