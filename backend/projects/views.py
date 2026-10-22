from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from .models import Project, ProjectAttachment
from .forms import ProjectRequestForm, ProjectAttachmentForm
from services.models import Service
from notifications.utils import create_notification


@login_required
def request_project(request, service_id):
    if not request.user.is_client():
        messages.error(request, 'Only clients can request projects.')
        return redirect('home')
    service = get_object_or_404(Service, pk=service_id, status=Service.STATUS_APPROVED)
    if request.method == 'POST':
        form = ProjectRequestForm(request.POST)
        if form.is_valid():
            project = form.save(commit=False)
            project.client = request.user
            project.freelancer = service.freelancer
            project.service = service
            project.status = Project.STATUS_PENDING
            project.save()
            # Handle attachment
            if request.FILES.get('attachment'):
                ProjectAttachment.objects.create(
                    project=project,
                    file=request.FILES['attachment'],
                    uploaded_by=request.user
                )
            create_notification(
                service.freelancer,
                'New Project Request',
                f'{request.user.get_full_name()} sent you a project request: "{project.title}"',
                'project'
            )
            messages.success(request, 'Project request sent successfully!')
            return redirect('projects:client_projects')
    else:
        form = ProjectRequestForm(initial={'title': service.title, 'budget': service.price})
    return render(request, 'projects/request_project.html', {'form': form, 'service': service})


@login_required
def client_projects(request):
    if not request.user.is_client():
        return redirect('home')
    projects = Project.objects.filter(client=request.user).select_related('freelancer', 'service')
    return render(request, 'projects/client_projects.html', {'projects': projects})


@login_required
def freelancer_projects(request):
    if not request.user.is_freelancer():
        return redirect('home')
    projects = Project.objects.filter(freelancer=request.user).select_related('client', 'service')
    return render(request, 'projects/freelancer_projects.html', {'projects': projects})


@login_required
def project_detail(request, pk):
    project = get_object_or_404(Project, pk=pk)
    # Only participants can view
    if request.user not in [project.client, project.freelancer] and not request.user.is_admin():
        messages.error(request, 'Access denied.')
        return redirect('home')
    attachment_form = ProjectAttachmentForm()
    attachments = project.attachments.all()
    from reviews.models import Review
    review = None
    can_review = False
    if request.user.is_client() and project.status == Project.STATUS_COMPLETED:
        try:
            review = Review.objects.get(project=project, client=request.user)
        except Review.DoesNotExist:
            can_review = True
    return render(request, 'projects/project_detail.html', {
        'project': project,
        'attachment_form': attachment_form,
        'attachments': attachments,
        'review': review,
        'can_review': can_review,
    })


@login_required
def accept_project(request, pk):
    project = get_object_or_404(Project, pk=pk, freelancer=request.user, status=Project.STATUS_PENDING)
    project.status = Project.STATUS_ACTIVE
    project.save()
    create_notification(project.client, 'Project Accepted', f'Your project request "{project.title}" has been accepted.', 'project')
    messages.success(request, 'Project accepted.')
    return redirect('projects:freelancer_projects')


@login_required
def reject_project(request, pk):
    project = get_object_or_404(Project, pk=pk, freelancer=request.user, status=Project.STATUS_PENDING)
    reason = request.POST.get('reason', '')
    project.status = Project.STATUS_REJECTED
    project.rejection_reason = reason
    project.save()
    create_notification(project.client, 'Project Rejected', f'Your project request "{project.title}" has been rejected.', 'project')
    messages.info(request, 'Project rejected.')
    return redirect('projects:freelancer_projects')


@login_required
def submit_project(request, pk):
    project = get_object_or_404(Project, pk=pk, freelancer=request.user, status=Project.STATUS_ACTIVE)
    if request.method == 'POST':
        # Handle file uploads
        files = request.FILES.getlist('files')
        for f in files:
            ProjectAttachment.objects.create(project=project, file=f, uploaded_by=request.user)
        project.status = Project.STATUS_SUBMITTED
        project.save()
        create_notification(project.client, 'Project Submitted', f'Freelancer has submitted work for "{project.title}". Please review.', 'project')
        messages.success(request, 'Project submitted for client review.')
        return redirect('projects:project_detail', pk=pk)
    return render(request, 'projects/submit_project.html', {'project': project})


@login_required
def confirm_completion(request, pk):
    project = get_object_or_404(Project, pk=pk, client=request.user, status=Project.STATUS_SUBMITTED)
    project.status = Project.STATUS_COMPLETED
    project.completed_at = timezone.now()
    project.save()
    # Update freelancer completed_projects count
    try:
        fp = project.freelancer.freelancer_profile
        fp.completed_projects += 1
        fp.save(update_fields=['completed_projects'])
    except Exception:
        pass
    create_notification(project.freelancer, 'Project Completed', f'Client confirmed completion of "{project.title}".', 'project')
    messages.success(request, 'Project marked as completed.')
    return redirect('projects:project_detail', pk=pk)


@login_required
def upload_attachment(request, pk):
    project = get_object_or_404(Project, pk=pk)
    if request.user not in [project.client, project.freelancer]:
        messages.error(request, 'Access denied.')
        return redirect('home')
    if request.method == 'POST':
        form = ProjectAttachmentForm(request.POST, request.FILES)
        if form.is_valid():
            att = form.save(commit=False)
            att.project = project
            att.uploaded_by = request.user
            att.save()
            messages.success(request, 'File uploaded.')
    return redirect('projects:project_detail', pk=pk)


@login_required
def cancel_project(request, pk):
    project = get_object_or_404(Project, pk=pk, client=request.user)
    if project.status in [Project.STATUS_PENDING, Project.STATUS_ACTIVE]:
        project.status = Project.STATUS_CANCELLED
        project.save()
        create_notification(project.freelancer, 'Project Cancelled', f'Client has cancelled project "{project.title}".', 'project')
        messages.info(request, 'Project cancelled.')
    return redirect('projects:client_projects')
