from workflow.admin import WorkflowReadOnlyAdmin
from django.contrib import admin
from .models import FreelancerProfile


@admin.register(FreelancerProfile)
class FreelancerProfileAdmin(WorkflowReadOnlyAdmin):
    list_display = ['user', 'professional_title', 'rating', 'completed_projects', 'availability', 'is_approved']
    list_filter = ['availability', 'is_approved']
    search_fields = ['user__username', 'user__email', 'professional_title', 'skills']
    readonly_fields = ['rating', 'completed_projects']
