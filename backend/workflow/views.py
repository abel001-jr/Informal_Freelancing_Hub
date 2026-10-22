from django.conf import settings
from django.db.models import Q, Sum, Avg
from django.http import FileResponse
from django.utils import timezone
from rest_framework import mixins, viewsets, permissions, serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from accounts.models import User
from projects.models import Project, ProjectAttachment
from services.models import Service
from api.views import IsAdminUser
from api.permissions import LockedObjectMixin, ReviewModerationMixin
from .models import Job, Proposal, ServiceRequest, Task, Payment, Dispute, DisputeResponse, Feedback, SupportTicket, AuditEvent, Milestone
from .serializers import (
    JobSerializer, ProposalSerializer, ServiceRequestSerializer, CounterofferSerializer,
    TaskSerializer, PaymentSerializer, DisputeSerializer, DisputeResponseSerializer,
    FeedbackSerializer, SupportTicketSerializer, AuditSerializer,
)
from .services import require, owner, participant, eligible, audit, notify, agree, project_event


class CreateReadViewSet(LockedObjectMixin, mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]


def visible_projects(user):
    return Project.objects.all() if user.is_admin() else Project.objects.filter(Q(client=user) | Q(freelancer=user))


class JobViewSet(mixins.UpdateModelMixin, CreateReadViewSet):
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Job.objects.select_related('client', 'category')
        user = self.request.user
        if self.request.query_params.get('mine') == 'true':
            return qs.filter(client=user) if user.is_authenticated else qs.none()
        if not (user.is_authenticated and user.is_admin()):
            public = Q(status='published', client__is_active=True)
            if user.is_authenticated:
                public |= Q(client=user) | Q(proposals__freelancer=user)
            qs = qs.filter(public).distinct()
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(skills__icontains=q) | Q(description__icontains=q))
        if self.request.query_params.get('category'):
            category = serializers.IntegerField(min_value=1).run_validation(self.request.query_params['category'])
            qs = qs.filter(category_id=category)
        return qs

    def perform_create(self, serializer):
        eligible(self.request.user, 'client')
        obj = serializer.save(client=self.request.user)
        audit(self.request.user, obj, 'job_created')

    def perform_update(self, serializer):
        owner(self.request.user, serializer.instance.client_id)
        require(serializer.instance.status in ('draft', 'rejected'), 'Only draft or rejected jobs can be edited.')
        obj = serializer.save(status='draft')
        audit(self.request.user, obj, 'job_updated')

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        job = self.get_object()
        owner(request.user, job.client_id)
        eligible(request.user, 'client')
        require(job.status in ('draft', 'rejected'), 'Only a draft or rejected job can be published.')
        require(job.deadline >= timezone.localdate() and job.category.is_active, 'Check deadline and category.')
        job.status = 'pending_review' if settings.MARKETPLACE_MODERATE_LISTINGS else 'published'
        job.moderation_reason = ''
        job.save()
        audit(request.user, job, 'job_published', status=job.status)
        return Response(self.get_serializer(job).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def moderate(self, request, pk=None):
        job = self.get_object()
        require(job.status == 'pending_review', 'Only pending jobs can be moderated.')
        require(request.data.get('decision') in ('approve', 'reject'), 'Choose approve or reject.')
        require(bool(str(request.data.get('reason', '')).strip()), 'Provide a moderation reason.')
        job.status = 'published' if request.data['decision'] == 'approve' else 'rejected'
        job.moderation_reason = str(request.data['reason'])
        job.save()
        audit(request.user, job, 'job_moderated', job.moderation_reason, status=job.status)
        notify([job.client], 'Job moderation', f'{job.title}: {job.status}')
        return Response(self.get_serializer(job).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        job = Job.objects.select_for_update().get(pk=self.get_object().pk)
        owner(request.user, job.client_id)
        require(job.status not in ('closed', 'cancelled'), 'This job is closed.')
        job.status = 'cancelled'
        job.save()
        for proposal in job.proposals.exclude(status__in=['rejected', 'withdrawn']):
            proposal.status = 'rejected'
            proposal.save()
            audit(request.user, proposal, 'job_cancelled')
            notify([proposal.freelancer], 'Job cancelled', job.title)
        audit(request.user, job, 'job_cancelled')
        return Response(self.get_serializer(job).data)


class OfferActions:
    def get_object(self):
        # agree() locks the job before the offer; avoid reversing that order here.
        return viewsets.GenericViewSet.get_object(self)

    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        offer = self.get_object()
        operation = request.data.get('action')
        data = request.data
        if operation == 'counteroffer':
            serializer = CounterofferSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data
        obj = agree(type(offer), offer.pk, request.user, operation, data)
        return Response(self.get_serializer(obj).data)


class ProposalViewSet(OfferActions, CreateReadViewSet):
    serializer_class = ProposalSerializer

    def get_queryset(self):
        qs = Proposal.objects.select_related('job', 'freelancer')
        if self.request.query_params.get('mine') == 'true':
            return qs.filter(freelancer=self.request.user)
        if self.request.user.is_admin():
            return qs
        return qs.filter(Q(freelancer=self.request.user) | Q(job__client=self.request.user))

    def perform_create(self, serializer):
        job = Job.objects.select_for_update().get(pk=serializer.validated_data['job'].pk)
        require(job.status == 'published' and job.deadline >= timezone.localdate(), 'The job is no longer open.')
        require(not Proposal.objects.filter(job=job, freelancer=self.request.user).exists(), 'You already applied.')
        obj = serializer.save(freelancer=self.request.user, freelancer_confirmed=True)
        audit(self.request.user, obj, 'proposal_submitted')
        notify([job.client], 'New proposal', f'New proposal for {job.title}')


class ServiceRequestViewSet(OfferActions, CreateReadViewSet):
    serializer_class = ServiceRequestSerializer

    def get_queryset(self):
        qs = ServiceRequest.objects.select_related('service', 'client')
        if self.request.query_params.get('workspace') == 'client':
            return qs.filter(client=self.request.user)
        if self.request.query_params.get('workspace') == 'freelancer':
            return qs.filter(service__freelancer=self.request.user)
        if self.request.user.is_admin():
            return qs
        return qs.filter(Q(client=self.request.user) | Q(service__freelancer=self.request.user))

    def perform_create(self, serializer):
        service = Service.objects.select_for_update().get(pk=serializer.validated_data['service'].pk)
        require(service.status == 'approved' and service.freelancer.is_active, 'This service is no longer available.')
        obj = serializer.save(client=self.request.user, client_confirmed=True)
        audit(self.request.user, obj, 'service_requested')
        notify([obj.service.freelancer], 'Service request', obj.title)


class TaskViewSet(mixins.UpdateModelMixin, CreateReadViewSet):
    serializer_class = TaskSerializer

    def get_queryset(self):
        return Task.objects.filter(project__in=visible_projects(self.request.user))

    def perform_create(self, serializer):
        obj = serializer.save()
        audit(self.request.user, obj, 'task_created')

    def perform_update(self, serializer):
        obj = serializer.save()
        audit(self.request.user, obj, 'task_updated', status=obj.status)


class PaymentViewSet(CreateReadViewSet):
    serializer_class = PaymentSerializer

    def get_queryset(self):
        return Payment.objects.filter(project__in=visible_projects(self.request.user))

    def perform_create(self, serializer):
        obj = serializer.save(submitted_by=self.request.user)
        audit(self.request.user, obj, 'payment_recorded')

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reconcile(self, request, pk=None):
        payment = Payment.objects.select_for_update().get(pk=self.get_object().pk)
        project = Project.objects.select_for_update().get(pk=payment.project_id)
        require(request.user.pk not in (project.client_id, project.freelancer_id), 'A project participant cannot reconcile their own payment.')
        decision = request.data.get('decision')
        require(decision in ('verify', 'reject', 'refund'), 'Choose verify, reject or refund.')
        require(bool(str(request.data.get('reason', '')).strip()), 'Provide the reconciliation evidence or reason.')
        require(payment.status == ('verified' if decision == 'refund' else 'pending'), 'This payment cannot be reconciled from its current state.')
        if decision == 'verify':
            require(project.status not in ('cancelled', 'completed'), 'The project is closed.')
            total = project.payments.filter(status='verified').aggregate(total=Sum('amount'))['total'] or 0
            require(total + payment.amount <= project.budget, 'Verified payments cannot exceed the agreement amount.')
            require(payment.currency == project.currency, 'Currency must match the project.')
        payment.status = {'verify': 'verified', 'reject': 'rejected', 'refund': 'refunded'}[decision]
        payment.verified_by = request.user
        payment.verified_at = timezone.now()
        payment.notes = str(request.data['reason'])
        payment.save()
        audit(request.user, payment, 'payment_reconciled', payment.notes, status=payment.status)
        notify([project.client, project.freelancer], 'Payment update', f'Payment record {payment.reference}: {payment.status}')
        return Response(self.get_serializer(payment).data)


class DisputeViewSet(CreateReadViewSet):
    serializer_class = DisputeSerializer

    def get_queryset(self):
        return Dispute.objects.filter(project__in=visible_projects(self.request.user))

    def perform_create(self, serializer):
        project = Project.objects.select_for_update().get(pk=serializer.validated_data['project'].pk)
        require(project.status in ('pending_activation', 'active', 'submitted', 'revision_requested', 'approved'), 'This project cannot be disputed now.')
        obj = serializer.save(opened_by=self.request.user, previous_status=project.status)
        previous = project.status
        project.status = 'disputed'
        project.save()
        project_event(project, self.request.user, 'dispute_opened', previous, obj.description)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def resolve(self, request, pk=None):
        dispute = Dispute.objects.select_for_update().get(pk=self.get_object().pk)
        project = Project.objects.select_for_update().get(pk=dispute.project_id)
        require(request.user.pk not in (project.client_id, project.freelancer_id), 'Participants cannot resolve their own dispute.')
        require(dispute.status == 'open' and project.status == 'disputed', 'This dispute is closed.')
        require(request.data.get('outcome') in ('resume', 'cancel'), 'Choose resume or cancel.')
        reason = str(request.data.get('reason', '')).strip()
        require(bool(reason), 'Provide a resolution.')
        if request.data['outcome'] == 'cancel':
            require(not project.payments.filter(status='verified').exists(), 'Reconcile refunds before cancelling the project.')
        project.status = dispute.previous_status if request.data['outcome'] == 'resume' else 'cancelled'
        project.save()
        dispute.status = 'resolved'
        dispute.resolution = reason
        dispute.save()
        audit(request.user, dispute, 'dispute_resolved', reason, outcome=request.data['outcome'])
        project_event(project, request.user, 'dispute_resolved', 'disputed', reason)
        return Response(self.get_serializer(dispute).data)


class DisputeResponseViewSet(CreateReadViewSet):
    serializer_class = DisputeResponseSerializer

    def get_queryset(self):
        return DisputeResponse.objects.filter(dispute__project__in=visible_projects(self.request.user))

    def perform_create(self, serializer):
        obj = serializer.save(author=self.request.user)
        audit(self.request.user, obj, 'dispute_response')
        notify([obj.dispute.project.client, obj.dispute.project.freelancer], 'Dispute response', 'A response was added to your dispute.')


class FeedbackViewSet(ReviewModerationMixin, CreateReadViewSet):
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Feedback.objects.all()
        return qs if self.request.user.is_authenticated and self.request.user.is_admin() else qs.filter(is_visible=True)

    def perform_create(self, serializer):
        from reviews.models import Review
        project = Project.objects.select_for_update().get(pk=serializer.validated_data['project'].pk)
        user = self.request.user
        require(not Feedback.objects.filter(project=project, author=user).exists(), 'You already reviewed this project.')
        if user.pk == project.client_id:
            require(not Review.objects.filter(project=project).exists(), 'You already reviewed this project.')
        recipient = project.freelancer if user.pk == project.client_id else project.client
        obj = serializer.save(author=user, recipient=recipient)
        if recipient.is_freelancer() and user.pk == project.client_id:
            recipient.freelancer_profile.update_rating()
        audit(user, obj, 'feedback_created')
        notify([recipient], 'New feedback', f'You received a {obj.rating}-star review.', 'review')


class SupportTicketViewSet(CreateReadViewSet):
    serializer_class = SupportTicketSerializer

    def get_queryset(self):
        qs = SupportTicket.objects.all()
        return qs if self.request.user.is_admin() else qs.filter(user=self.request.user)

    def perform_create(self, serializer):
        obj = serializer.save(user=self.request.user)
        audit(self.request.user, obj, 'support_requested')

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def resolve(self, request, pk=None):
        ticket = self.get_object()
        require(ticket.status == 'open', 'This ticket is closed.')
        require(bool(str(request.data.get('response', '')).strip()), 'Provide a response.')
        ticket.response = str(request.data['response'])
        ticket.status = 'resolved'
        ticket.save()
        audit(request.user, ticket, 'support_resolved', ticket.response)
        notify([ticket.user], 'Support update', f'Your ticket "{ticket.subject}" has a response.', 'general')
        return Response(self.get_serializer(ticket).data)


class AuditViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditEvent.objects.all()
    serializer_class = AuditSerializer
    permission_classes = [IsAdminUser]


class AttachmentSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = ProjectAttachment
        fields = ['id', 'project', 'description', 'uploaded_by', 'uploaded_at', 'file', 'download_url']
        read_only_fields = ['uploaded_by', 'uploaded_at']
        extra_kwargs = {'file': {'write_only': True}}

    def get_download_url(self, obj):
        return f'/api/attachments/{obj.pk}/download/'

    def validate_file(self, value):
        require(value.size <= 10 * 1024 * 1024, 'Attachments must be at most 10 MB.')
        return value

    def validate_project(self, project):
        participant(self.context['request'].user, project)
        require(project.status not in ('completed', 'cancelled'), 'This project is closed.')
        return project


class AttachmentViewSet(CreateReadViewSet):
    serializer_class = AttachmentSerializer

    def get_queryset(self):
        return ProjectAttachment.objects.filter(project__in=visible_projects(self.request.user))

    def perform_create(self, serializer):
        obj = serializer.save(uploaded_by=self.request.user)
        audit(self.request.user, obj, 'attachment_uploaded')

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        obj = self.get_object()
        return FileResponse(obj.file.open('rb'), as_attachment=True, filename=obj.filename())


@api_view(['GET'])
def dashboard(request):
    projects = visible_projects(request.user)
    data = {
        'active_projects': projects.filter(status='active').count(),
        'completed_projects': projects.filter(status='completed').count(),
        'unread_notifications': request.user.notifications.filter(is_read=False).count(),
        'jobs': Job.objects.filter(client=request.user).count(),
        'proposals': Proposal.objects.filter(freelancer=request.user).count(),
        'owned_services': Service.objects.filter(freelancer=request.user).exclude(status='archived').count(),
        'published_services': Service.objects.filter(freelancer=request.user, status='approved').count(),
        'freelancer_active_projects': projects.filter(freelancer=request.user, status__in=['active', 'revision_requested', 'submitted']).count(),
        'freelancer_completed_projects': projects.filter(freelancer=request.user, status='completed').count(),
        'client_active_projects': projects.filter(client=request.user, status__in=['active', 'revision_requested', 'submitted']).count(),
        'client_completed_projects': projects.filter(client=request.user, status='completed').count(),
    }
    if request.user.is_admin():
        data['total_users'] = User.objects.count()
        data['pending_services'] = Service.objects.filter(status='pending').count()
        data['pending_jobs'] = Job.objects.filter(status='pending_review').count()
        data['open_disputes'] = Dispute.objects.filter(status='open').count()
        data['verified_payment_total'] = str(Payment.objects.filter(status='verified').aggregate(total=Sum('amount'))['total'] or 0)
    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def configuration(request):
    return Response({
        'currency': 'SLE', 'currency_label': 'NLe',
        'moderation_required': settings.MARKETPLACE_MODERATE_LISTINGS,
        'email_verification_required': settings.MARKETPLACE_REQUIRE_VERIFIED_EMAIL,
        'payment_mode': 'manual_records',
        'payment_required_to_activate': settings.MARKETPLACE_REQUIRE_PAYMENT_TO_ACTIVATE,
        'payment_required_to_complete': settings.MARKETPLACE_REQUIRE_PAYMENT_TO_COMPLETE,
        'matching': 'filtered_search',
    })


class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = '__all__'
        read_only_fields = ['status', 'created_at', 'updated_at']

    def validate(self, attrs):
        project = Project.objects.select_for_update().get(pk=attrs['project'].pk)
        owner(self.context['request'].user, project.client_id)
        require(project.status == 'pending_activation', 'Plan milestones before project activation.')
        total = project.milestones.aggregate(total=Sum('amount'))['total'] or 0
        require(total + attrs['amount'] <= project.budget, 'Milestone amounts cannot exceed the agreement budget.')
        require(timezone.localdate() <= attrs['due_date'] <= project.deadline, 'Milestone due date must be within the project schedule.')
        return attrs


class MilestoneViewSet(CreateReadViewSet):
    serializer_class = MilestoneSerializer

    def get_queryset(self):
        return Milestone.objects.filter(project__in=visible_projects(self.request.user))

    def perform_create(self, serializer):
        obj = serializer.save()
        audit(self.request.user, obj, 'milestone_created')

    @action(detail=True, methods=['post'])
    def transition(self, request, pk=None):
        milestone = Milestone.objects.select_for_update().get(pk=self.get_object().pk)
        project = Project.objects.select_for_update().get(pk=milestone.project_id)
        require(project.status in ('active', 'revision_requested', 'submitted'), 'The project is not accepting milestone updates.')
        operation = request.data.get('action')
        if operation == 'submit':
            owner(request.user, project.freelancer_id)
            require(milestone.status == 'planned', 'Only planned milestones can be submitted.')
            milestone.status = 'submitted'
        elif operation in ('approve', 'request_revision'):
            owner(request.user, project.client_id)
            require(milestone.status == 'submitted', 'Only submitted milestones can be reviewed.')
            milestone.status = 'approved' if operation == 'approve' else 'planned'
        else:
            raise serializers.ValidationError('Choose submit, approve or request_revision.')
        milestone.save()
        audit(request.user, milestone, 'milestone_' + operation)
        notify([project.client, project.freelancer], 'Milestone update', f'{milestone.title}: {milestone.status}')
        return Response(self.get_serializer(milestone).data)
