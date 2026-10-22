from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import ClientProfile
from .forms import ClientProfileForm


@login_required
def edit_profile(request):
    if not request.user.is_client():
        messages.error(request, 'Access denied.')
        return redirect('home')
    profile, _ = ClientProfile.objects.get_or_create(user=request.user)
    if request.method == 'POST':
        form = ClientProfileForm(request.POST, instance=profile)
        if form.is_valid():
            form.save()
            messages.success(request, 'Profile updated successfully.')
            return redirect('clients:my_profile')
    else:
        form = ClientProfileForm(instance=profile)
    return render(request, 'clients/edit_profile.html', {'form': form})


@login_required
def my_profile(request):
    if not request.user.is_client():
        return redirect('home')
    profile, _ = ClientProfile.objects.get_or_create(user=request.user)
    return render(request, 'clients/my_profile.html', {'profile': profile})
