from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import Review
from .forms import ReviewForm
from projects.models import Project
from notifications.utils import create_notification


@login_required
def create_review(request, project_id):
    if not request.user.is_client():
        messages.error(request, 'Only clients can leave reviews.')
        return redirect('home')
    project = get_object_or_404(Project, pk=project_id, client=request.user, status=Project.STATUS_COMPLETED)
    if hasattr(project, 'review'):
        messages.warning(request, 'You have already reviewed this project.')
        return redirect('projects:project_detail', pk=project_id)
    if request.method == 'POST':
        form = ReviewForm(request.POST)
        if form.is_valid():
            review = form.save(commit=False)
            review.project = project
            review.client = request.user
            review.freelancer = project.freelancer
            review.save()
            # Update freelancer rating
            try:
                project.freelancer.freelancer_profile.update_rating()
            except Exception:
                pass
            create_notification(
                project.freelancer,
                'New Review Received',
                f'{request.user.get_full_name()} left you a {review.rating}-star review.',
                'review'
            )
            messages.success(request, 'Review submitted successfully.')
            return redirect('projects:project_detail', pk=project_id)
    else:
        form = ReviewForm()
    return render(request, 'reviews/create_review.html', {'form': form, 'project': project})
