from decimal import Decimal
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Record(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at', '-pk']


class Job(Record):
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='jobs')
    category = models.ForeignKey('services.Category', on_delete=models.PROTECT)
    title = models.CharField(max_length=200)
    description = models.TextField()
    skills = models.CharField(max_length=300)
    location = models.CharField(max_length=100, blank=True)
    work_arrangement = models.CharField(max_length=20, choices=[('remote', 'Remote'), ('onsite', 'On site'), ('hybrid', 'Hybrid')], default='remote')
    payment_type = models.CharField(max_length=20, choices=[('fixed', 'Fixed total')], default='fixed')
    budget = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    deadline = models.DateField()
    deliverables = models.TextField()
    status = models.CharField(max_length=20, default='draft', choices=[(s, s.replace('_', ' ').title()) for s in ['draft', 'pending_review', 'published', 'hiring', 'closed', 'rejected', 'cancelled']])
    moderation_reason = models.TextField(blank=True)

    class Meta(Record.Meta):
        constraints = [models.CheckConstraint(condition=models.Q(budget__gt=0), name='job_budget_positive')]


class Terms(Record):
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    deadline = models.DateField()
    scope = models.TextField()
    status = models.CharField(max_length=20, default='pending', choices=[(s, s.title()) for s in ['pending', 'shortlisted', 'selected', 'negotiating', 'accepted', 'rejected', 'withdrawn']])
    client_confirmed = models.BooleanField(default=False)
    freelancer_confirmed = models.BooleanField(default=False)

    class Meta(Record.Meta):
        abstract = True


class Proposal(Terms):
    job = models.ForeignKey(Job, on_delete=models.PROTECT, related_name='proposals')
    freelancer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='proposals')
    cover_letter = models.TextField()
    sample_url = models.URLField(blank=True)
    project = models.OneToOneField('projects.Project', null=True, blank=True, on_delete=models.PROTECT, related_name='source_proposal')

    class Meta(Terms.Meta):
        constraints = [
            models.UniqueConstraint(fields=['job', 'freelancer'], name='one_proposal_per_job_freelancer'),
            models.CheckConstraint(condition=models.Q(amount__gt=0), name='proposal_amount_positive'),
        ]


class ServiceRequest(Terms):
    service = models.ForeignKey('services.Service', on_delete=models.PROTECT, related_name='requests')
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='service_requests')
    title = models.CharField(max_length=200)
    location = models.CharField(max_length=100, blank=True)
    project = models.OneToOneField('projects.Project', null=True, blank=True, on_delete=models.PROTECT, related_name='source_request')

    class Meta(Terms.Meta):
        constraints = [models.CheckConstraint(condition=models.Q(amount__gt=0), name='service_request_amount_positive')]


class AuditEvent(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    entity = models.CharField(max_length=100)
    entity_id = models.PositiveBigIntegerField()
    action = models.CharField(max_length=100)
    reason = models.TextField(blank=True)
    data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'pk']


class ProjectEvent(Record):
    project = models.ForeignKey('projects.Project', on_delete=models.PROTECT, related_name='history')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(max_length=50)
    note = models.TextField(blank=True)
    previous_status = models.CharField(max_length=30)
    status = models.CharField(max_length=30)


class Task(Record):
    project = models.ForeignKey('projects.Project', on_delete=models.PROTECT, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, default='todo', choices=[('todo', 'To do'), ('in_progress', 'In progress'), ('done', 'Done')])


class Payment(Record):
    project = models.ForeignKey('projects.Project', on_delete=models.PROTECT, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    currency = models.CharField(max_length=3, default='SLE')
    reference = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, default='pending', choices=[('pending', 'Pending reconciliation'), ('verified', 'Verified'), ('rejected', 'Rejected'), ('refunded', 'Refunded')])
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='payment_submissions')
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name='payment_verifications')
    verified_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta(Record.Meta):
        constraints = [models.CheckConstraint(condition=models.Q(amount__gt=0), name='payment_amount_positive')]


class Milestone(Record):
    project = models.ForeignKey('projects.Project', on_delete=models.PROTECT, related_name='milestones')
    title = models.CharField(max_length=200)
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    due_date = models.DateField()
    status = models.CharField(max_length=20, default='planned', choices=[('planned', 'Planned'), ('submitted', 'Submitted'), ('approved', 'Approved')])

    class Meta(Record.Meta):
        constraints = [models.CheckConstraint(condition=models.Q(amount__gt=0), name='milestone_amount_positive')]


class Dispute(Record):
    project = models.ForeignKey('projects.Project', on_delete=models.PROTECT, related_name='disputes')
    opened_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    description = models.TextField()
    previous_status = models.CharField(max_length=30)
    status = models.CharField(max_length=20, default='open', choices=[('open', 'Open'), ('resolved', 'Resolved')])
    resolution = models.TextField(blank=True)

    class Meta(Record.Meta):
        constraints = [models.UniqueConstraint(fields=['project'], condition=models.Q(status='open'), name='one_open_dispute_per_project')]


class DisputeResponse(Record):
    dispute = models.ForeignKey(Dispute, on_delete=models.PROTECT, related_name='responses')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    message = models.TextField()


class Feedback(Record):
    project = models.ForeignKey('projects.Project', on_delete=models.PROTECT, related_name='feedback')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='authored_feedback')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='feedback_received')
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    is_visible = models.BooleanField(default=True)

    class Meta(Record.Meta):
        constraints = [
            models.UniqueConstraint(fields=['project', 'author'], name='one_feedback_per_participant'),
            models.CheckConstraint(condition=models.Q(rating__gte=1, rating__lte=5), name='feedback_rating_1_to_5'),
        ]


class SupportTicket(Record):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    subject = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=20, default='open', choices=[('open', 'Open'), ('resolved', 'Resolved')])
    response = models.TextField(blank=True)
