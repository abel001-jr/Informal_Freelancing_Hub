from rest_framework import serializers
from workflow.services import require, participant
from accounts.models import User
from freelancers.models import FreelancerProfile
from clients.models import ClientProfile
from services.models import Service, Category
from projects.models import Project
from reviews.models import Review
from notifications.models import Notification
from reports.models import Report
from messaging.models import Message


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'location']
        read_only_fields = fields


class FreelancerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    def validate_hourly_rate(self, value):
        require(value is None or value > 0, 'Hourly rate must be positive.')
        return value

    class Meta:
        model = FreelancerProfile
        fields = '__all__'
        read_only_fields = ['is_approved', 'rating', 'completed_projects']


class ClientProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ClientProfile
        fields = '__all__'


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class ServiceSerializer(serializers.ModelSerializer):
    freelancer = UserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.filter(is_active=True), source='category', write_only=True
    )

    class Meta:
        model = Service
        fields = '__all__'
        read_only_fields = ['status', 'rejection_reason', 'created_at', 'updated_at']

    def validate_image(self, value):
        require(value is None or value.size <= 5 * 1024 * 1024, 'Images must be at most 5 MB.')
        return value

    def validate_price(self, value):
        require(value > 0, 'Price must be positive.')
        return value

    def validate_delivery_days(self, value):
        require(value > 0, 'Delivery must take at least one day.')
        return value


class ProjectSerializer(serializers.ModelSerializer):
    client = UserSerializer(read_only=True)
    freelancer = UserSerializer(read_only=True)

    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = [field.name for field in Project._meta.fields]


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'date_joined']
        read_only_fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'date_joined']


class ReviewSerializer(serializers.ModelSerializer):
    client = UserSerializer(read_only=True)
    freelancer = UserSerializer(read_only=True)

    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ['is_visible', 'created_at']
        validators = []

    def validate_project(self, project):
        from workflow.models import Feedback
        require(project.client_id == self.context['request'].user.pk, 'Only the project client may review here.')
        require(project.status == 'completed', 'The project must be completed.')
        require(not Review.objects.filter(project=project).exists() and not Feedback.objects.filter(project=project, author=project.client).exists(), 'You already reviewed this project.')
        return project


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['user', 'title', 'message', 'notification_type', 'link', 'created_at']


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ['reporter', 'status', 'admin_notes', 'created_at', 'resolved_at']

    def validate_project(self, project):
        if project:
            participant(self.context['request'].user, project)
        return project


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)
    receiver_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(is_active=True), source='receiver', write_only=True)
    attachment = serializers.FileField(write_only=True, required=False)
    attachment_url = serializers.SerializerMethodField()

    def get_attachment_url(self, obj):
        return f'/api/messages/{obj.pk}/download/' if obj.attachment else None

    def validate_attachment(self, value):
        require(value.size <= 10 * 1024 * 1024, 'Attachments must be at most 10 MB.')
        return value

    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ['is_read', 'created_at']

    def validate(self, attrs):
        user = self.context['request'].user
        require(attrs['receiver'].pk != user.pk, 'Choose a different recipient.')
        if attrs.get('project'):
            participant(user, attrs['project'])
            participant(attrs['receiver'], attrs['project'])
        return attrs
