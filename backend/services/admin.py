from workflow.admin import WorkflowReadOnlyAdmin
from django.contrib import admin
from .models import Category, Service


@admin.register(Category)
class CategoryAdmin(WorkflowReadOnlyAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(Service)
class ServiceAdmin(WorkflowReadOnlyAdmin):
    list_display = ['title', 'freelancer', 'category', 'price', 'status', 'created_at']
    list_filter = ['status', 'category']
    search_fields = ['title', 'freelancer__username', 'description']
    ordering = ['-created_at']
