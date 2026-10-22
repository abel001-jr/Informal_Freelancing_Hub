from django.urls import path
from . import views

app_name = 'freelancers'

urlpatterns = [
    path('', views.freelancer_list, name='list'),
    path('profile/edit/', views.edit_profile, name='edit_profile'),
    path('profile/me/', views.my_profile, name='my_profile'),
    path('<str:username>/', views.freelancer_detail, name='detail'),
]
