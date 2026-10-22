from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    # Admin
    path('admin/', views.admin_dashboard, name='admin_dashboard'),
    path('admin/users/', views.admin_users, name='admin_users'),
    path('admin/users/<int:user_id>/toggle/', views.admin_toggle_user, name='admin_toggle_user'),
    path('admin/services/', views.admin_services, name='admin_services'),
    path('admin/services/<int:pk>/approve/', views.admin_approve_service, name='admin_approve_service'),
    path('admin/services/<int:pk>/reject/', views.admin_reject_service, name='admin_reject_service'),
    path('admin/services/<int:pk>/delete/', views.admin_delete_service, name='admin_delete_service'),
    path('admin/categories/', views.admin_categories, name='admin_categories'),
    path('admin/categories/<int:pk>/edit/', views.admin_edit_category, name='admin_edit_category'),
    path('admin/categories/<int:pk>/delete/', views.admin_delete_category, name='admin_delete_category'),
    path('admin/projects/', views.admin_projects, name='admin_projects'),
    path('admin/reviews/', views.admin_reviews, name='admin_reviews'),
    path('admin/reviews/<int:pk>/delete/', views.admin_delete_review, name='admin_delete_review'),
    path('admin/reports/', views.admin_reports, name='admin_reports'),
    path('admin/reports/<int:pk>/update/', views.admin_update_report, name='admin_update_report'),
    path('admin/notifications/', views.admin_notifications, name='admin_notifications'),
    # Freelancer
    path('freelancer/', views.freelancer_dashboard, name='freelancer_dashboard'),
    # Client
    path('client/', views.client_dashboard, name='client_dashboard'),
]
