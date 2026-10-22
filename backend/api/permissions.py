from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import BasePermission
from rest_framework.permissions import SAFE_METHODS


class LockedObjectMixin:
    """Refresh mutable rows under a lock inside ATOMIC_REQUESTS transactions."""
    def get_object(self):
        obj = super().get_object()
        if self.request.method not in SAFE_METHODS:
            obj = type(obj).objects.select_for_update().get(pk=obj.pk)
            self.check_object_permissions(self.request, obj)
        return obj


class IsMarketplaceAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin()


class ReviewModerationMixin:
    @action(detail=True, methods=['post'], permission_classes=[IsMarketplaceAdmin])
    def moderate(self, request, pk=None):
        from workflow.services import require, audit, notify
        from freelancers.models import FreelancerProfile
        obj = self.get_object()
        require(type(request.data.get('is_visible')) is bool, 'Provide is_visible as a boolean.')
        reason = str(request.data.get('reason', '')).strip()
        require(bool(reason), 'Provide a moderation reason.')
        obj.is_visible = request.data['is_visible']
        obj.save(update_fields=['is_visible'])
        recipient_id = obj.freelancer_id if hasattr(obj, 'freelancer_id') else obj.recipient_id
        profile = FreelancerProfile.objects.filter(user_id=recipient_id).first()
        if profile:
            profile.update_rating()
        audit(request.user, obj, 'review_moderated', reason, is_visible=obj.is_visible)
        return Response(self.get_serializer(obj).data)
