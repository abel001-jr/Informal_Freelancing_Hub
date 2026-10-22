from django.urls import path
from . import views

app_name = 'clients'

urlpatterns = [
    path('profile/edit/', views.edit_profile, name='edit_profile'),
    path('profile/me/', views.my_profile, name='my_profile'),
]
