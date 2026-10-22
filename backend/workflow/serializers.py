from decimal import Decimal
from django.utils import timezone
from rest_framework import serializers
from projects.models import Project
from services.models import Category, Service
from .models import Job, Proposal, ServiceRequest, Task, Payment, Dispute, DisputeResponse, Feedback, SupportTicket, AuditEvent, ProjectEvent
from .services import require, eligible, participant


class FutureDateMixin:
    def validate_deadline(self, value):
        require(value >= timezone.localdate(), 'Deadline must be today or later.')
        return value


class CounterofferSerializer(FutureDateMixin, serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    deadline = serializers.DateField()
    scope = serializers.CharField()


class JobSerializer(FutureDateMixin, serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.filter(is_active=True))

    class Meta:
        model = Job
        fields = '__all__'
        read_only_fields = ['client', 'status', 'moderation_reason', 'created_at', 'updated_at']


class ProposalSerializer(FutureDateMixin, serializers.ModelSerializer):
    class Meta:
        model = Proposal
        fields = '__all__'
        read_only_fields = ['freelancer', 'status', 'project', 'client_confirmed', 'freelancer_confirmed', 'created_at', 'updated_at']
        validators = []  # Owner is assigned by the view; the database also enforces uniqueness.

    def validate(self, attrs):
        user = self.context['request'].user
        eligible(user, 'freelancer')
        job = attrs['job']
        require(job.status == 'published' and job.deadline >= timezone.localdate() and job.client.is_active, 'This job is not open.')
        require(job.client_id != user.pk, 'You cannot apply to your own job.')
        require(not Proposal.objects.filter(job=job, freelancer=user).exists(), 'You already submitted a proposal for this job.')
        return attrs


class ServiceRequestSerializer(FutureDateMixin, serializers.ModelSerializer):
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.filter(status='approved', freelancer__is_active=True))

    class Meta:
        model = ServiceRequest
        fields = '__all__'
        read_only_fields = ['client', 'status', 'project', 'client_confirmed', 'freelancer_confirmed', 'created_at', 'updated_at']

    def validate(self, attrs):
        user = self.context['request'].user
        eligible(user, 'client')
        require(attrs['service'].freelancer_id != user.pk, 'You cannot request your own service.')
        return attrs


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, attrs):
        project = self.instance.project if self.instance else attrs['project']
        participant(self.context['request'].user, project)
        require(project.status in ('pending_activation', 'active', 'revision_requested'), 'Tasks are locked at this project stage.')
        if self.instance:
            require('project' not in attrs or attrs['project'].pk == project.pk, 'A task cannot be moved to another project.')
        return attrs


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['status', 'submitted_by', 'verified_by', 'verified_at', 'notes', 'created_at', 'updated_at']

    def validate(self, attrs):
        project = attrs['project']
        require(project.client_id == self.context['request'].user.pk, 'Only the client can submit a payment record.')
        require(project.status not in ('cancelled', 'completed', 'disputed'), 'Payment records are unavailable for this project state.')
        require(attrs.get('currency', 'SLE') == project.currency, 'Currency must match the project.')
        return attrs


class DisputeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dispute
        fields = '__all__'
        read_only_fields = ['opened_by', 'previous_status', 'status', 'resolution', 'created_at', 'updated_at']
        validators = []

    def validate_project(self, project):
        participant(self.context['request'].user, project)
        require(project.status in ('pending_activation', 'active', 'submitted', 'revision_requested', 'approved'), 'A dispute cannot be opened at this stage.')
        return project


class DisputeResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = DisputeResponse
        fields = '__all__'
        read_only_fields = ['author', 'created_at', 'updated_at']

    def validate_dispute(self, dispute):
        user = self.context['request'].user
        if not user.is_admin():
            participant(user, dispute.project)
        require(dispute.status == 'open', 'This dispute is closed.')
        return dispute


class FeedbackSerializer(serializers.ModelSerializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)

    class Meta:
        model = Feedback
        fields = '__all__'
        read_only_fields = ['author', 'recipient', 'is_visible', 'created_at', 'updated_at']
        validators = []

    def validate_project(self, project):
        user = self.context['request'].user
        participant(user, project)
        require(project.status == Project.STATUS_COMPLETED, 'Only completed projects can be reviewed.')
        require(not Feedback.objects.filter(project=project, author=user).exists(), 'You already reviewed this project.')
        # Prevent a second client review through the legacy review endpoint.
        if project.client_id == user.pk:
            require(not hasattr(project, 'review'), 'You already reviewed this project.')
        return project


class SupportTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = '__all__'
        read_only_fields = ['user', 'status', 'response', 'created_at', 'updated_at']


class AuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = '__all__'


class ProjectEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectEvent
        fields = '__all__'
