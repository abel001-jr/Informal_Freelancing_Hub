from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator
from django.db.models import Q
from .models import Service, Category
from .forms import ServiceForm
from accounts.models import User


def service_list(request):
    """Public marketplace listing"""
    services = Service.objects.filter(status=Service.STATUS_APPROVED).select_related('freelancer', 'category')
    categories = Category.objects.filter(is_active=True)

    query = request.GET.get('q', '')
    category_id = request.GET.get('category', '')
    min_price = request.GET.get('min_price', '')
    max_price = request.GET.get('max_price', '')
    min_rating = request.GET.get('rating', '')
    max_delivery = request.GET.get('delivery', '')

    if query:
        services = services.filter(
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(skills__icontains=query) |
            Q(freelancer__first_name__icontains=query) |
            Q(freelancer__last_name__icontains=query)
        )
    if category_id:
        services = services.filter(category_id=category_id)
    if min_price:
        services = services.filter(price__gte=min_price)
    if max_price:
        services = services.filter(price__lte=max_price)
    if min_rating:
        services = services.filter(freelancer__freelancer_profile__rating__gte=min_rating)
    if max_delivery:
        services = services.filter(delivery_days__lte=max_delivery)

    paginator = Paginator(services, 12)
    page = request.GET.get('page')
    services = paginator.get_page(page)

    selected_category = None
    if category_id:
        try:
            selected_category = Category.objects.get(id=category_id)
        except Category.DoesNotExist:
            pass

    return render(request, 'services/service_list.html', {
        'services': services,
        'categories': categories,
        'query': query,
        'category_id': category_id,
        'min_price': min_price,
        'max_price': max_price,
        'min_rating': min_rating,
        'max_delivery': max_delivery,
        'selected_category': selected_category,
    })


def service_detail(request, pk):
    service = get_object_or_404(Service, pk=pk, status=Service.STATUS_APPROVED)
    from reviews.models import Review
    reviews = Review.objects.filter(freelancer=service.freelancer).order_by('-created_at')[:5]
    try:
        freelancer_profile = service.freelancer.freelancer_profile
    except Exception:
        freelancer_profile = None
    return render(request, 'services/service_detail.html', {
        'service': service,
        'reviews': reviews,
        'freelancer_profile': freelancer_profile,
    })


@login_required
def create_service(request):
    if not request.user.is_freelancer():
        messages.error(request, 'Only freelancers can create services.')
        return redirect('home')
    if request.method == 'POST':
        form = ServiceForm(request.POST, request.FILES)
        if form.is_valid():
            service = form.save(commit=False)
            service.freelancer = request.user
            service.status = Service.STATUS_PENDING
            service.save()
            # notify admin
            from notifications.utils import create_notification
            from accounts.models import User as UserModel
            admins = UserModel.objects.filter(role=UserModel.ROLE_ADMIN)
            for admin in admins:
                create_notification(admin, 'New Service Pending', f'A new service "{service.title}" is awaiting approval.', 'service')
            messages.success(request, 'Service submitted for approval. You will be notified once reviewed.')
            return redirect('freelancers:my_profile')
    else:
        form = ServiceForm()
    return render(request, 'services/create_service.html', {'form': form})


@login_required
def edit_service(request, pk):
    service = get_object_or_404(Service, pk=pk, freelancer=request.user)
    if request.method == 'POST':
        form = ServiceForm(request.POST, request.FILES, instance=service)
        if form.is_valid():
            service = form.save(commit=False)
            service.status = Service.STATUS_PENDING
            service.save()
            messages.success(request, 'Service updated and resubmitted for approval.')
            return redirect('freelancers:my_profile')
    else:
        form = ServiceForm(instance=service)
    return render(request, 'services/edit_service.html', {'form': form, 'service': service})


@login_required
def delete_service(request, pk):
    service = get_object_or_404(Service, pk=pk, freelancer=request.user)
    if request.method == 'POST':
        service.delete()
        messages.success(request, 'Service deleted.')
        return redirect('freelancers:my_profile')
    return render(request, 'services/delete_service.html', {'service': service})
