from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views
from .health import health
from . import auth
from workflow import views as workflow_views

router = DefaultRouter()
router.register('users', views.UserViewSet)
router.register('clients', views.ClientProfileViewSet, basename='client-profile')
router.register('freelancers', views.FreelancerProfileViewSet)
router.register('categories', views.CategoryViewSet)
router.register('services', views.ServiceViewSet)
router.register('projects', views.ProjectViewSet, basename='project')
router.register('reviews', views.ReviewViewSet, basename='review')
router.register('notifications', views.NotificationViewSet, basename='notification')
router.register('reports', views.ReportViewSet, basename='report')
router.register('messages', views.MessageViewSet, basename='message')

for prefix, view in [
    ('jobs', workflow_views.JobViewSet),
    ('proposals', workflow_views.ProposalViewSet),
    ('service-requests', workflow_views.ServiceRequestViewSet),
    ('tasks', workflow_views.TaskViewSet),
    ('milestones', workflow_views.MilestoneViewSet),
    ('payments', workflow_views.PaymentViewSet),
    ('disputes', workflow_views.DisputeViewSet),
    ('dispute-responses', workflow_views.DisputeResponseViewSet),
    ('feedback', workflow_views.FeedbackViewSet),
    ('support-tickets', workflow_views.SupportTicketViewSet),
    ('audit-events', workflow_views.AuditViewSet),
    ('attachments', workflow_views.AttachmentViewSet),
]:
    router.register(prefix, view, basename=prefix)

urlpatterns = [
    path('auth/register/', auth.RegisterView.as_view(), name='register'),
    path('auth/enable-capability/', auth.enable_capability, name='enable-capability'),
    path('auth/me/', auth.AccountView.as_view(), name='account'),
    path('auth/change-password/', auth.change_password, name='change-password'),
    path('auth/verify-email/', auth.verify_email, name='verify-email'),
    path('auth/resend-verification/', auth.resend_verification, name='resend-verification'),
    path('auth/password-reset/', auth.password_reset, name='password-reset'),
    path('auth/password-reset-confirm/', auth.password_reset_confirm, name='password-reset-confirm'),
    path('dashboard/', workflow_views.dashboard, name='api-dashboard'),
    path('configuration/', workflow_views.configuration, name='api-configuration'),
    path('health/', health, name='api-health'),
    path('', include(router.urls)),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/', include('rest_framework.urls')),
]
