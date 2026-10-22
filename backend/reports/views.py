from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import Report
from .forms import ReportForm
from accounts.models import User
from services.models import Service


@login_required
def report_user(request, user_id):
    reported = get_object_or_404(User, pk=user_id)
    if request.method == 'POST':
        form = ReportForm(request.POST)
        if form.is_valid():
            report = form.save(commit=False)
            report.reporter = request.user
            report.reported_user = reported
            report.save()
            messages.success(request, 'Report submitted. Our team will review it.')
            return redirect('home')
    else:
        form = ReportForm()
    return render(request, 'reports/report_form.html', {'form': form, 'reported': reported})


@login_required
def report_service(request, service_id):
    service = get_object_or_404(Service, pk=service_id)
    if request.method == 'POST':
        form = ReportForm(request.POST)
        if form.is_valid():
            report = form.save(commit=False)
            report.reporter = request.user
            report.reported_user = service.freelancer
            report.service = service
            report.save()
            messages.success(request, 'Report submitted. Our team will review it.')
            return redirect('services:detail', pk=service_id)
    else:
        form = ReportForm()
    return render(request, 'reports/report_form.html', {'form': form, 'service': service})
