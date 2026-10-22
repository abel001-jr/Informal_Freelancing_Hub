from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, permissions, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from accounts.models import User
from freelancers.models import FreelancerProfile
from clients.models import ClientProfile
from services.models import Service, Category
from projects.models import Project
from reviews.models import Review
from notifications.models import Notification
from reports.models import Report
from messaging.models import Message
from workflow.services import require, owner, eligible, audit, notify, transition_project
from workflow.serializers import ProjectEventSerializer
from .permissions import LockedObjectMixin, ReviewModerationMixin
from .serializers import (
    AdminUserSerializer, FreelancerProfileSerializer, ClientProfileSerializer,
    CategorySerializer, ServiceSerializer, ProjectSerializer,
    ReviewSerializer, NotificationSerializer, ReportSerializer, MessageSerializer,
)


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin()


class UserViewSet(LockedObjectMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    queryset = User.objects.all().order_by('pk')
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]

    def perform_update(self, serializer):
        require(not serializer.instance.is_admin(), 'Administrator accounts cannot be suspended through this endpoint.')
        require(bool(self.request.data.get('reason', '').strip()), 'Provide a reason for the account change.')
        user = serializer.save()
        audit(self.request.user, user, 'account_updated', self.request.data['reason'], is_active=user.is_active)


class FreelancerProfileViewSet(LockedObjectMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    queryset = FreelancerProfile.objects.all()
    serializer_class = FreelancerProfileSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = FreelancerProfile.objects.select_related('user')
        if self.request.user.is_authenticated and self.request.user.is_admin():
            return qs
        public = Q(user__is_active=True, is_approved=True)
        if self.request.user.is_authenticated:
            public |= Q(user=self.request.user)
        return qs.filter(public).order_by('-rating', 'pk')

    def perform_update(self, serializer):
        owner(self.request.user, serializer.instance.user_id)
        serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def moderate(self, request, pk=None):
        profile = self.get_object()
        require(type(request.data.get('is_approved')) is bool, 'Provide is_approved as a boolean.')
        require(bool(request.data.get('reason', '').strip()), 'Provide a reason.')
        profile.is_approved = request.data['is_approved']
        profile.save()
        audit(request.user, profile, 'profile_moderated', request.data['reason'], is_approved=profile.is_approved)
        return Response(self.get_serializer(profile).data)


class ClientProfileViewSet(LockedObjectMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = ClientProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ClientProfile.objects.filter(user=self.request.user).order_by('pk')

    def perform_update(self, serializer):
        serializer.save()


class CategoryViewSet(LockedObjectMixin, viewsets.ModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer

    def get_permissions(self):
        return [permissions.AllowAny()] if self.action in ['list', 'retrieve'] else [IsAdminUser()]

    def perform_create(self, serializer):
        obj = serializer.save()
        audit(self.request.user, obj, 'category_created')

    def perform_update(self, serializer):
        obj = serializer.save()
        audit(self.request.user, obj, 'category_updated')

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()
        audit(self.request.user, instance, 'category_archived')


class ServiceViewSet(LockedObjectMixin, viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Service.objects.select_related('freelancer', 'category')
        user = self.request.user
        if self.request.query_params.get('mine') == 'true':
            return qs.filter(freelancer=user).order_by('-created_at', '-pk') if user.is_authenticated else qs.none()
        if not (user.is_authenticated and user.is_admin()):
            public = Q(status='approved', freelancer__is_active=True)
            if user.is_authenticated:
                public |= Q(freelancer=user)
            qs = qs.filter(public)
        for field in ['category_id', 'min_price', 'max_price']:
            value = self.request.query_params.get(field)
            if value:
                from rest_framework import serializers
                value = serializers.IntegerField(min_value=1).run_validation(value) if field == 'category_id' else serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0).run_validation(value)
                qs = qs.filter(**{ {'category_id': 'category_id', 'min_price': 'price__gte', 'max_price': 'price__lte'}[field]: value})
        if self.request.query_params.get('q'):
            q = self.request.query_params['q']
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q) | Q(skills__icontains=q))
        return qs

    def perform_create(self, serializer):
        eligible(self.request.user, 'freelancer')
        obj = serializer.save(freelancer=self.request.user, status='draft')
        audit(self.request.user, obj, 'service_created')

    def perform_update(self, serializer):
        owner(self.request.user, serializer.instance.freelancer_id)
        require(serializer.instance.status in ['draft', 'rejected', 'paused'], 'Pause the service before editing it.')
        eligible(self.request.user, 'freelancer')
        obj = serializer.save(status='draft')
        audit(self.request.user, obj, 'service_updated')

    def perform_destroy(self, instance):
        owner(self.request.user, instance.freelancer_id)
        instance.status = 'archived'
        instance.save()
        audit(self.request.user, instance, 'service_archived')

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        service = self.get_object()
        owner(request.user, service.freelancer_id)
        eligible(request.user, 'freelancer')
        require(service.status in ['draft', 'rejected', 'paused'], 'The service cannot be published from its current state.')
        require(service.category is not None and service.category.is_active, 'Choose an active category.')
        service.status = 'pending' if settings.MARKETPLACE_MODERATE_LISTINGS else 'approved'
        service.rejection_reason = ''
        service.save()
        audit(request.user, service, 'service_published', status=service.status)
        return Response(self.get_serializer(service).data)

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        service = self.get_object()
        owner(request.user, service.freelancer_id)
        require(service.status == 'approved', 'Only approved services may be paused.')
        service.status = 'paused'
        service.save()
        audit(request.user, service, 'service_paused')
        return Response(self.get_serializer(service).data)

    def moderate(self, request, approved):
        service = self.get_object()
        require(service.status == 'pending', 'Only pending services may be moderated.')
        reason = request.data.get('reason', '')
        require(bool(str(reason).strip()), 'Provide the moderation reason.')
        service.status = 'approved' if approved else 'rejected'
        service.rejection_reason = '' if approved else reason
        service.save()
        audit(request.user, service, 'service_moderated', reason, status=service.status)
        notify([service.freelancer], 'Service moderation', f'{service.title}: {service.status}', 'service')
        return Response(self.get_serializer(service).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        return self.moderate(request, True)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        return self.moderate(request, False)


class ProjectViewSet(LockedObjectMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Project.objects.select_related('client', 'freelancer')
        if self.request.query_params.get('workspace') == 'freelancer':
            return qs.filter(freelancer=self.request.user).order_by('-created_at', '-pk')
        if self.request.query_params.get('workspace') == 'client':
            return qs.filter(client=self.request.user).order_by('-created_at', '-pk')
        if self.request.user.is_admin():
            return qs
        return qs.filter(Q(client=self.request.user) | Q(freelancer=self.request.user))

    @action(detail=True, methods=['post'])
    def transition(self, request, pk=None):
        project = self.get_object()
        obj = transition_project(project.pk, request.user, request.data.get('action'), str(request.data.get('note', '')))
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        return Response(ProjectEventSerializer(self.get_object().history.all(), many=True).data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        project = Project.objects.select_for_update().get(pk=self.get_object().pk)
        owner(request.user, project.freelancer_id)
        eligible(request.user, 'freelancer')
        require(project.origin == 'legacy' and project.status in ['pending', 'accepted'], 'New agreements must use their proposal or service request.')
        require(project.client.is_active, 'The client must be active.')
        previous = project.status
        project.status = 'pending_activation'
        project.save()
        from workflow.services import project_event
        project_event(project, request.user, 'legacy_agreement_accepted', previous)
        return Response(self.get_serializer(project).data)


class ReviewViewSet(ReviewModerationMixin, LockedObjectMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    def get_queryset(self):
        qs = Review.objects.all()
        return qs if self.request.user.is_authenticated and self.request.user.is_admin() else qs.filter(is_visible=True)

    def perform_create(self, serializer):
        project = Project.objects.select_for_update().get(pk=serializer.validated_data['project'].pk)
        from workflow.models import Feedback
        require(not Review.objects.filter(project=project).exists() and not Feedback.objects.filter(project=project, author=self.request.user).exists(), 'This project already has a review.')
        review = serializer.save(client=self.request.user, freelancer=project.freelancer)
        project.freelancer.freelancer_profile.update_rating()
        audit(self.request.user, review, 'review_created')
        notify([project.freelancer], 'New review', f'You received a {review.rating}-star review.', 'review')


class NotificationViewSet(LockedObjectMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'all marked read'})


class ReportViewSet(LockedObjectMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Report.objects.all() if self.request.user.is_admin() else Report.objects.filter(reporter=self.request.user)

    def perform_create(self, serializer):
        obj = serializer.save(reporter=self.request.user)
        audit(self.request.user, obj, 'report_created')

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def resolve(self, request, pk=None):
        report = self.get_object()
        require(report.status not in ['resolved', 'rejected'], 'This report is closed.')
        require(request.data.get('status') in ['under_review', 'resolved', 'rejected'], 'Choose a valid report state.')
        require(bool(str(request.data.get('reason', '')).strip()), 'Provide the outcome or review notes.')
        report.status = request.data['status']
        report.admin_notes = str(request.data['reason'])
        if report.status in ['resolved', 'rejected']:
            report.resolved_at = timezone.now()
        report.save()
        audit(request.user, report, 'report_updated', report.admin_notes, status=report.status)
        notify([report.reporter], 'Report update', f'Your report is {report.status}.', 'report')
        return Response(self.get_serializer(report).data)


class MessageViewSet(LockedObjectMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(Q(sender=user) | Q(receiver=user))

    def perform_create(self, serializer):
        message = serializer.save(sender=self.request.user)
        notify([message.receiver], 'New message', 'You received a new message.', 'message')

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        from django.http import FileResponse, Http404
        from pathlib import Path
        message = self.get_object()
        if not message.attachment:
            raise Http404
        return FileResponse(message.attachment.open('rb'), as_attachment=True, filename=Path(message.attachment.name).name)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        message = self.get_object()
        owner(request.user, message.receiver_id)
        message.is_read = True
        message.save(update_fields=['is_read'])
        return Response(self.get_serializer(message).data)
