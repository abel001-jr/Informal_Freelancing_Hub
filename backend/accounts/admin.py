from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['-date_joined']
    fieldsets = UserAdmin.fieldsets + (
        ('Role & Profile', {'fields': ('role', 'active_workspace', 'email_verified', 'terms_accepted_at', 'phone', 'location', 'preferred_language', 'biography', 'profile_picture', 'cover_picture')}),
    )

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        from workflow.services import audit
        audit(request.user, obj, 'admin_account_changed', 'Django admin account maintenance', fields=list(form.changed_data))

    def has_delete_permission(self, request, obj=None):
        return False
