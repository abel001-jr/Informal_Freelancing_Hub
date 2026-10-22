from workflow.admin import WorkflowReadOnlyAdmin
from django.contrib import admin
from .models import Project, ProjectAttachment


@admin.register(Project)
class ProjectAdmin(WorkflowReadOnlyAdmin):
    list_display = ['title', 'client', 'freelancer', 'budget', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['title', 'client__username', 'freelancer__username']
    ordering = ['-created_at']


@admin.register(ProjectAttachment)
class ProjectAttachmentAdmin(WorkflowReadOnlyAdmin):
    list_display = ['project', 'uploaded_by', 'uploaded_at']
