from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Avg, Count
from django.utils import timezone
from accounts.models import User
from freelancers.models import FreelancerProfile
from clients.models import ClientProfile
from services.models import Service, Category
from projects.models import Project
from reviews.models import Review
from reports.models import Report
from notifications.models import Notification


def admin_required(view_func):
    """Decorator to restrict access to admin users only"""
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated or not request.user.is_admin():
            messages.error(request, 'Access denied.')
            return redirect('home')
        return view_func(request, *args, **kwargs)
    return login_required(wrapper)


def freelancer_required(view_func):
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated or not request.user.is_freelancer():
            messages.error(request, 'Access denied.')
            return redirect('home')
        return view_func(request, *args, **kwargs)
    return login_required(wrapper)


def client_required(view_func):
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated or not request.user.is_client():
            messages.error(request, 'Access denied.')
            return redirect('home')
        return view_func(request, *args, **kwargs)
    return login_required(wrapper)


# ===== ADMIN DASHBOARD =====

@admin_required
def admin_dashboard(request):
    stats = {
        'total_users': User.objects.count(),
        'total_freelancers': User.objects.filter(role=User.ROLE_FREELANCER).count(),
        'total_clients': User.objects.filter(role=User.ROLE_CLIENT).count(),
        'total_services': Service.objects.count(),
        'pending_services': Service.objects.filter(status=Service.STATUS_PENDING).count(),
        'approved_services': Service.objects.filter(status=Service.STATUS_APPROVED).count(),
        'active_projects': Project.objects.filter(status=Project.STATUS_ACTIVE).count(),
        'completed_projects': Project.objects.filter(status=Project.STATUS_COMPLETED).count(),
        'pending_requests': Project.objects.filter(status=Project.STATUS_PENDING).count(),
        'total_reports': Report.objects.count(),
        'pending_reports': Report.objects.filter(status=Report.STATUS_PENDING).count(),
        'avg_rating': Review.objects.aggregate(avg=Avg('rating'))['avg'] or 0,
    }
    recent_users = User.objects.order_by('-date_joined')[:5]
    recent_services = Service.objects.order_by('-created_at')[:5]
    recent_projects = Project.objects.order_by('-created_at')[:5]
    recent_reports = Report.objects.filter(status=Report.STATUS_PENDING)[:5]

    return render(request, 'dashboard/admin/dashboard.html', {
        'stats': stats,
        'recent_users': recent_users,
        'recent_services': recent_services,
        'recent_projects': recent_projects,
        'recent_reports': recent_reports,
    })


@admin_required
def admin_users(request):
    users = User.objects.all().order_by('-date_joined')
    query = request.GET.get('q', '')
    role = request.GET.get('role', '')
    status = request.GET.get('status', '')
    if query:
        users = users.filter(username__icontains=query) | users.filter(email__icontains=query) | users.filter(first_name__icontains=query)
    if role:
        users = users.filter(role=role)
    if status == 'active':
        users = users.filter(is_active=True)
    elif status == 'inactive':
        users = users.filter(is_active=False)
    return render(request, 'dashboard/admin/users.html', {'users': users, 'query': query, 'role': role})


@admin_required
def admin_toggle_user(request, user_id):
    user = get_object_or_404(User, pk=user_id)
    if user.is_admin():
        messages.error(request, 'Cannot deactivate admin accounts.')
        return redirect('dashboard:admin_users')
    user.is_active = not user.is_active
    user.save()
    status = 'activated' if user.is_active else 'suspended'
    messages.success(request, f'User {user.username} has been {status}.')
    return redirect('dashboard:admin_users')


@admin_required
def admin_services(request):
    services = Service.objects.all().select_related('freelancer', 'category').order_by('-created_at')
    status = request.GET.get('status', '')
    if status:
        services = services.filter(status=status)
    return render(request, 'dashboard/admin/services.html', {'services': services, 'status': status})


@admin_required
def admin_approve_service(request, pk):
    service = get_object_or_404(Service, pk=pk)
    service.status = Service.STATUS_APPROVED
    service.save()
    from notifications.utils import create_notification
    create_notification(service.freelancer, 'Service Approved', f'Your service "{service.title}" has been approved and is now live.', 'service')
    messages.success(request, 'Service approved.')
    return redirect('dashboard:admin_services')


@admin_required
def admin_reject_service(request, pk):
    service = get_object_or_404(Service, pk=pk)
    reason = request.POST.get('reason', 'Does not meet our guidelines.')
    service.status = Service.STATUS_REJECTED
    service.rejection_reason = reason
    service.save()
    from notifications.utils import create_notification
    create_notification(service.freelancer, 'Service Rejected', f'Your service "{service.title}" has been rejected. Reason: {reason}', 'service')
    messages.info(request, 'Service rejected.')
    return redirect('dashboard:admin_services')


@admin_required
def admin_delete_service(request, pk):
    service = get_object_or_404(Service, pk=pk)
    service.delete()
    messages.success(request, 'Service deleted.')
    return redirect('dashboard:admin_services')


@admin_required
def admin_categories(request):
    categories = Category.objects.all()
    from services.forms import CategoryForm
    if request.method == 'POST':
        form = CategoryForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            messages.success(request, 'Category created.')
            return redirect('dashboard:admin_categories')
    else:
        form = CategoryForm()
    return render(request, 'dashboard/admin/categories.html', {'categories': categories, 'form': form})


@admin_required
def admin_edit_category(request, pk):
    category = get_object_or_404(Category, pk=pk)
    from services.forms import CategoryForm
    if request.method == 'POST':
        form = CategoryForm(request.POST, request.FILES, instance=category)
        if form.is_valid():
            form.save()
            messages.success(request, 'Category updated.')
            return redirect('dashboard:admin_categories')
    else:
        form = CategoryForm(instance=category)
    return render(request, 'dashboard/admin/edit_category.html', {'form': form, 'category': category})


@admin_required
def admin_delete_category(request, pk):
    category = get_object_or_404(Category, pk=pk)
    if request.method == 'POST':
        category.delete()
        messages.success(request, 'Category deleted.')
        return redirect('dashboard:admin_categories')
    return render(request, 'dashboard/admin/confirm_delete.html', {'object': category, 'type': 'category'})


@admin_required
def admin_projects(request):
    projects = Project.objects.all().select_related('client', 'freelancer').order_by('-created_at')
    status = request.GET.get('status', '')
    if status:
        projects = projects.filter(status=status)
    return render(request, 'dashboard/admin/projects.html', {'projects': projects, 'status': status})


@admin_required
def admin_reviews(request):
    reviews = Review.objects.all().select_related('client', 'freelancer', 'project').order_by('-created_at')
    return render(request, 'dashboard/admin/reviews.html', {'reviews': reviews})


@admin_required
def admin_delete_review(request, pk):
    review = get_object_or_404(Review, pk=pk)
    if request.method == 'POST':
        freelancer = review.freelancer
        review.delete()
        try:
            freelancer.freelancer_profile.update_rating()
        except Exception:
            pass
        messages.success(request, 'Review removed.')
        return redirect('dashboard:admin_reviews')
    return render(request, 'dashboard/admin/confirm_delete.html', {'object': review, 'type': 'review'})


@admin_required
def admin_reports(request):
    reports = Report.objects.all().select_related('reporter', 'reported_user').order_by('-created_at')
    status = request.GET.get('status', '')
    if status:
        reports = reports.filter(status=status)
    return render(request, 'dashboard/admin/reports.html', {'reports': reports, 'status': status})


@admin_required
def admin_update_report(request, pk):
    report = get_object_or_404(Report, pk=pk)
    if request.method == 'POST':
        new_status = request.POST.get('status')
        notes = request.POST.get('admin_notes', '')
        if new_status in [s[0] for s in Report.STATUS_CHOICES]:
            report.status = new_status
            report.admin_notes = notes
            if new_status == Report.STATUS_RESOLVED:
                report.resolved_at = timezone.now()
            report.save()
            messages.success(request, 'Report updated.')
    return redirect('dashboard:admin_reports')


@admin_required
def admin_notifications(request):
    notifications = Notification.objects.all().order_by('-created_at')[:50]
    return render(request, 'dashboard/admin/notifications.html', {'notifications': notifications})


# ===== FREELANCER DASHBOARD =====

@freelancer_required
def freelancer_dashboard(request):
    user = request.user
    services = Service.objects.filter(freelancer=user)
    projects = Project.objects.filter(freelancer=user)
    notifications = Notification.objects.filter(user=user, is_read=False)[:5]

    stats = {
        'total_services': services.count(),
        'approved_services': services.filter(status=Service.STATUS_APPROVED).count(),
        'pending_services': services.filter(status=Service.STATUS_PENDING).count(),
        'active_projects': projects.filter(status=Project.STATUS_ACTIVE).count(),
        'pending_requests': projects.filter(status=Project.STATUS_PENDING).count(),
        'completed_projects': projects.filter(status=Project.STATUS_COMPLETED).count(),
    }
    try:
        profile = user.freelancer_profile
    except Exception:
        from freelancers.models import FreelancerProfile
        profile = FreelancerProfile.objects.create(user=user)

    recent_projects = projects.order_by('-created_at')[:5]
    return render(request, 'dashboard/freelancer/dashboard.html', {
        'stats': stats,
        'profile': profile,
        'recent_projects': recent_projects,
        'notifications': notifications,
    })


# ===== CLIENT DASHBOARD =====

@client_required
def client_dashboard(request):
    user = request.user
    projects = Project.objects.filter(client=user)
    notifications = Notification.objects.filter(user=user, is_read=False)[:5]

    stats = {
        'total_projects': projects.count(),
        'pending_requests': projects.filter(status=Project.STATUS_PENDING).count(),
        'active_projects': projects.filter(status=Project.STATUS_ACTIVE).count(),
        'completed_projects': projects.filter(status=Project.STATUS_COMPLETED).count(),
    }
    try:
        profile = user.client_profile
    except Exception:
        from clients.models import ClientProfile
        profile = ClientProfile.objects.create(user=user)

    recent_projects = projects.order_by('-created_at')[:5]
    return render(request, 'dashboard/client/dashboard.html', {
        'stats': stats,
        'profile': profile,
        'recent_projects': recent_projects,
        'notifications': notifications,
    })
