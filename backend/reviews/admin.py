from workflow.admin import WorkflowReadOnlyAdmin
from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(WorkflowReadOnlyAdmin):
    list_display = ['project', 'client', 'freelancer', 'rating', 'created_at']
    list_filter = ['rating']
    search_fields = ['client__username', 'freelancer__username']
    ordering = ['-created_at']
