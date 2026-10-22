from django.contrib import admin
from .models import Job, Proposal, ServiceRequest, Task, Payment, Dispute, DisputeResponse, Feedback, SupportTicket, AuditEvent, ProjectEvent, Milestone


class WorkflowReadOnlyAdmin(admin.ModelAdmin):
    """State changes must pass through the audited workflow API."""
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


for model in [Job, Proposal, ServiceRequest, Task, Payment, Dispute, DisputeResponse, Feedback, SupportTicket, AuditEvent, ProjectEvent, Milestone]:
    admin.site.register(model, WorkflowReadOnlyAdmin)
