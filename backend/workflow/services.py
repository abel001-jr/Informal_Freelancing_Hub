from django.conf import settings
from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from freelancers.models import FreelancerProfile
from notifications.utils import create_notification
from projects.models import Project
from .models import AuditEvent, ProjectEvent, Proposal, ServiceRequest


def require(condition, message):
    if not condition:
        raise ValidationError(message)


def owner(user, owner_id):
    if user.pk != owner_id:
        raise PermissionDenied('Only the owner may perform this action.')


def participant(user, project):
    if user.pk not in (project.client_id, project.freelancer_id):
        raise PermissionDenied('Only project participants may perform this action.')


def eligible(user, capability):
    if not user.is_active or not getattr(user, f'is_{capability}')():
        raise PermissionDenied(f'A {capability} account is required.')
    require(user.terms_accepted_at is not None, 'Accept the platform terms before continuing.')
    if settings.MARKETPLACE_REQUIRE_VERIFIED_EMAIL:
        require(user.email_verified, 'Verify your email before continuing.')
    require(bool(user.first_name and user.last_name and user.location), 'Complete your name and location first.')
    if capability == 'freelancer':
        profile = FreelancerProfile.objects.filter(user=user).first()
        require(profile is not None and profile.is_approved and profile.availability and bool(profile.skills and profile.professional_title),
                'Complete an approved, available freelancer profile with skills and a professional title.')


def audit(actor, obj, action, reason='', **data):
    AuditEvent.objects.create(actor=actor, entity=obj._meta.label_lower, entity_id=obj.pk,
                              action=action, reason=reason, data=data)


def notify(users, title, message, kind='project'):
    for user in set(users):
        create_notification(user, title, message, kind)


def project_event(project, actor, action, previous_status, note=''):
    ProjectEvent.objects.create(project=project, actor=actor, action=action,
                                previous_status=previous_status, status=project.status, note=note)
    audit(actor, project, action, note, previous_status=previous_status, status=project.status)
    notify([project.client, project.freelancer], 'Project update', f'{project.title}: {action}')


def paid_in_full(project):
    amount = project.payments.filter(status='verified').aggregate(total=Sum('amount'))['total'] or 0
    return amount >= project.budget


@transaction.atomic
def agree(model, pk, user, operation, data):
    # Lock the parent first so two offers for the same job cannot both be hired.
    if model is Proposal:
        from .models import Job
        job_id = Proposal.objects.get(pk=pk).job_id
        job = Job.objects.select_for_update().get(pk=job_id)
    offer = model.objects.select_for_update().get(pk=pk)
    client = offer.job.client if model is Proposal else offer.client
    freelancer = offer.freelancer if model is Proposal else offer.service.freelancer
    if user.pk not in (client.pk, freelancer.pk):
        raise PermissionDenied('Only the parties to this offer may respond.')
    require(offer.status not in ('accepted', 'rejected', 'withdrawn'), 'This offer is closed.')
    if model is Proposal:
        require(job.status in ('published', 'hiring'), 'This job is no longer accepting agreements.')
    else:
        require(offer.service.status == 'approved' and freelancer.is_active, 'This service is not currently available.')
    require(client.is_active and freelancer.is_active, 'Both accounts must be active.')
    previous_offer_status = offer.status

    if operation == 'counteroffer':
        require(model is ServiceRequest or offer.status in ('selected', 'negotiating'), 'The client must select the proposal before negotiation.')
        for field in ('amount', 'deadline', 'scope'):
            setattr(offer, field, data[field])
        offer.client_confirmed = user == client
        offer.freelancer_confirmed = user == freelancer
        offer.status = 'negotiating'
    elif operation == 'select':
        require(model is Proposal, 'Selection is only available for proposals.')
        owner(user, client.pk)
        require(offer.status in ('pending', 'shortlisted'), 'This proposal cannot be selected.')
        require(not job.proposals.exclude(pk=offer.pk).filter(status__in=['selected', 'negotiating', 'accepted']).exists(), 'Another proposal is already selected.')
        offer.status = 'selected'
        offer.client_confirmed = True
        offer.freelancer_confirmed = False
        job.status = 'hiring'
        job.save()
    elif operation == 'confirm':
        if model is Proposal:
            require(offer.status in ('selected', 'negotiating'), 'The proposal must be selected first.')
        eligible(user, 'client' if user == client else 'freelancer')
        if user == client:
            require(not offer.client_confirmed, 'You already confirmed these terms.')
            offer.client_confirmed = True
        else:
            require(not offer.freelancer_confirmed, 'You already confirmed these terms.')
            offer.freelancer_confirmed = True
    elif operation == 'reject':
        owner(user, client.pk if model is Proposal else freelancer.pk)
        offer.status = 'rejected'
    elif operation == 'withdraw':
        owner(user, freelancer.pk if model is Proposal else client.pk)
        offer.status = 'withdrawn'
    elif operation == 'shortlist':
        require(model is Proposal and offer.status == 'pending', 'Only pending proposals can be shortlisted.')
        owner(user, client.pk)
        offer.status = 'shortlisted'
    else:
        raise ValidationError('Unsupported offer action.')

    if operation not in ('reject', 'withdraw'):
        require(offer.deadline >= timezone.localdate(), 'The agreement deadline has passed.')
    offer.save()
    audit(user, offer, operation, data.get('reason', ''), amount=str(offer.amount), deadline=str(offer.deadline), scope=offer.scope)
    if offer.status in ('rejected', 'withdrawn') and model is Proposal and job.status == 'hiring' and previous_offer_status in ('selected', 'negotiating'):
        job.status = 'published'
        job.save()
    if offer.client_confirmed and offer.freelancer_confirmed and operation == 'confirm':
        eligible(client, 'client')
        eligible(freelancer, 'freelancer')
        project = Project.objects.create(
            client=client, freelancer=freelancer,
            service=offer.service if model is ServiceRequest else None,
            title=offer.title if model is ServiceRequest else job.title,
            description=offer.scope, requirements=offer.scope, budget=offer.amount,
            deadline=offer.deadline, status=Project.STATUS_PENDING_ACTIVATION,
            origin='service' if model is ServiceRequest else 'job',
        )
        offer.project = project
        offer.status = 'accepted'
        offer.save()
        if model is Proposal:
            job.status = 'closed'
            job.save()
            for other in job.proposals.exclude(pk=offer.pk).filter(status__in=['pending', 'shortlisted']):
                other.status = 'rejected'
                other.save()
                audit(user, other, 'not_selected')
                notify([other.freelancer], 'Hiring decision', f'{job.title} has been filled.')
        project_event(project, user, 'agreement_recorded', '', offer.scope)
    notify([client, freelancer], 'Offer update', f'Offer {offer.pk}: {operation}')
    return offer


@transaction.atomic
def transition_project(pk, actor, action, note=''):
    project = Project.objects.select_for_update().get(pk=pk)
    participant(actor, project)
    previous = project.status
    rules = {
        'activate': (project.client_id, ['pending_activation'], 'active'),
        'submit': (project.freelancer_id, ['active', 'revision_requested'], 'submitted'),
        'request_revision': (project.client_id, ['submitted'], 'revision_requested'),
        'approve': (project.client_id, ['submitted'], 'approved'),
        'complete': (project.client_id, ['approved'], 'completed'),
    }
    if action == 'cancel':
        owner(actor, project.client_id)
        require(previous == 'pending_activation', 'Active work must use the dispute process for cancellation.')
        target = 'cancelled'
    else:
        require(action in rules, 'Unsupported project action.')
        actor_id, states, target = rules[action]
        owner(actor, actor_id)
        require(previous in states, f'Cannot {action} a project in {previous} state.')
    if action in ('submit', 'request_revision'):
        require(bool(note.strip()), 'Describe the delivery or requested revisions.')
    if action == 'activate':
        require(project.deadline >= timezone.localdate(), 'Update the agreement before activating an overdue project.')
        if settings.MARKETPLACE_REQUIRE_PAYMENT_TO_ACTIVATE:
            require(paid_in_full(project), 'Verified payment is required before activation.')
    if action == 'complete':
        require(not project.tasks.exclude(status='done').exists(), 'Complete all tasks and milestones first.')
        require(not project.milestones.exclude(status='approved').exists(), 'Approve all milestones first.')
        if settings.MARKETPLACE_REQUIRE_PAYMENT_TO_COMPLETE:
            require(paid_in_full(project), 'Verified settlement is required before completion.')
        project.completed_at = timezone.now()
        FreelancerProfile.objects.filter(user_id=project.freelancer_id).update(completed_projects=F('completed_projects') + 1)
    project.status = target
    project.save()
    project_event(project, actor, action, previous, note)
    return project
