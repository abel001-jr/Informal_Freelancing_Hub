from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator
from .models import FreelancerProfile
from .forms import FreelancerProfileForm
from accounts.models import User
from services.models import Service
from reviews.models import Review


def freelancer_list(request):
    freelancers = FreelancerProfile.objects.filter(
        user__is_active=True, is_approved=True
    ).select_related('user').order_by('-rating')

    query = request.GET.get('q', '')
    skill = request.GET.get('skill', '')
    location = request.GET.get('location', '')

    if query:
        freelancers = freelancers.filter(
            user__first_name__icontains=query
        ) | freelancers.filter(
            user__last_name__icontains=query
        ) | freelancers.filter(
            professional_title__icontains=query
        ) | freelancers.filter(
            skills__icontains=query
        )
    if skill:
        freelancers = freelancers.filter(skills__icontains=skill)
    if location:
        freelancers = freelancers.filter(user__location__icontains=location)

    paginator = Paginator(freelancers, 12)
    page = request.GET.get('page')
    freelancers = paginator.get_page(page)

    return render(request, 'freelancers/freelancer_list.html', {
        'freelancers': freelancers,
        'query': query,
        'skill': skill,
        'location': location,
    })


def freelancer_detail(request, username):
    user = get_object_or_404(User, username=username, role=User.ROLE_FREELANCER)
    profile = get_object_or_404(FreelancerProfile, user=user)
    services = Service.objects.filter(freelancer=user, status=Service.STATUS_APPROVED)
    reviews = Review.objects.filter(freelancer=user).select_related('client').order_by('-created_at')
    return render(request, 'freelancers/freelancer_detail.html', {
        'profile': profile,
        'freelancer': user,
        'services': services,
        'reviews': reviews,
    })


@login_required
def edit_profile(request):
    if not request.user.is_freelancer():
        messages.error(request, 'Access denied.')
        return redirect('home')
    profile, _ = FreelancerProfile.objects.get_or_create(user=request.user)
    if request.method == 'POST':
        form = FreelancerProfileForm(request.POST, instance=profile)
        if form.is_valid():
            form.save()
            messages.success(request, 'Profile updated successfully.')
            return redirect('freelancers:my_profile')
    else:
        form = FreelancerProfileForm(instance=profile)
    return render(request, 'freelancers/edit_profile.html', {'form': form})


@login_required
def my_profile(request):
    if not request.user.is_freelancer():
        return redirect('home')
    profile, _ = FreelancerProfile.objects.get_or_create(user=request.user)
    services = Service.objects.filter(freelancer=request.user)
    reviews = Review.objects.filter(freelancer=request.user).order_by('-created_at')
    return render(request, 'freelancers/my_profile.html', {
        'profile': profile,
        'services': services,
        'reviews': reviews,
    })
