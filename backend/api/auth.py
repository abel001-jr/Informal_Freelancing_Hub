from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework import serializers, generics, permissions
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from accounts.models import User
from clients.models import ClientProfile
from freelancers.models import FreelancerProfile
from workflow.services import require, audit
from .serializers import FreelancerProfileSerializer, ClientProfileSerializer


def verification_mail(user):
    token = signing.dumps({'user': user.pk, 'email': user.email}, salt='verify-email')
    send_mail('Verify your FreelanceHub account',
              f'Enter this verification token in FreelanceHub (valid for 24 hours):\n{token}',
              settings.DEFAULT_FROM_EMAIL, [user.email])


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=['client', 'freelancer', 'both'])
    accept_terms = serializers.BooleanField(write_only=True)
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'phone', 'role', 'location', 'accept_terms']
        read_only_fields = ['id']

    def validate_email(self, email):
        require(not User.objects.filter(email__iexact=email).exists(), 'This email address is already registered.')
        return email.lower()

    def validate(self, attrs):
        require(attrs['accept_terms'], 'You must accept the platform terms.')
        user = User(**{key: value for key, value in attrs.items() if key not in ('password', 'accept_terms')})
        try:
            password_validation.validate_password(attrs['password'], user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': exc.messages})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop('accept_terms')
        user = User.objects.create_user(**validated_data, terms_accepted_at=timezone.now())
        user.active_workspace = 'freelancer' if user.role == 'freelancer' else 'client'
        user.save(update_fields=['active_workspace'])
        if user.is_client():
            ClientProfile.objects.create(user=user)
        if user.is_freelancer():
            FreelancerProfile.objects.create(user=user)
        audit(user, user, 'registered')
        transaction.on_commit(lambda: verification_mail(user))
        return user


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]


class AccountSerializer(serializers.ModelSerializer):
    accept_terms = serializers.BooleanField(write_only=True, required=False)
    is_admin = serializers.SerializerMethodField()
    email = serializers.EmailField()
    freelancer_profile = FreelancerProfileSerializer(read_only=True)
    client_profile = ClientProfileSerializer(read_only=True)

    def get_is_admin(self, obj):
        return obj.is_admin()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'profile_picture', 'cover_picture', 'location', 'preferred_language', 'biography', 'freelancer_profile', 'client_profile', 'role', 'is_admin', 'is_active', 'date_joined', 'email_verified', 'active_workspace', 'terms_accepted_at', 'accept_terms']
        read_only_fields = ['id', 'username', 'role', 'is_active', 'date_joined', 'email_verified', 'terms_accepted_at']

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('This email address is already registered.')
        return value.lower()

    def validate_profile_picture(self, value):
        if value is not None:
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError('Choose an image smaller than 5 MB.')
            if getattr(value.image, 'format', '') not in ('JPEG', 'PNG', 'WEBP'):
                raise serializers.ValidationError('Use a JPEG, PNG, or WebP image.')
        return value

    def validate_cover_picture(self, value):
        return self.validate_profile_picture(value)

    def validate_active_workspace(self, value):
        require(getattr(self.instance, f'is_{value}')(), 'This account does not have that capability.')
        return value

    @transaction.atomic
    def update(self, instance, validated_data):
        email_changed = 'email' in validated_data and validated_data['email'].lower() != instance.email.lower()
        if email_changed:
            validated_data['email_verified'] = False
        if validated_data.pop('accept_terms', False):
            instance.terms_accepted_at = timezone.now()
        instance = super().update(instance, validated_data)
        if 'biography' in validated_data:
            FreelancerProfile.objects.filter(user=instance).update(biography=instance.biography)
            ClientProfile.objects.filter(user=instance).update(biography=instance.biography)
        audit(instance, instance, 'profile_updated')
        if email_changed:
            transaction.on_commit(lambda: verification_mail(instance))
        return instance


class AccountView(generics.RetrieveUpdateAPIView):
    serializer_class = AccountSerializer

    def get_object(self):
        return User.objects.select_related('freelancer_profile', 'client_profile').get(pk=self.request.user.pk)


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = self.context['request'].user
        if not user.check_password(attrs['current_password']):
            raise serializers.ValidationError({'current_password': 'Your current password is incorrect.'})
        try:
            password_validation.validate_password(attrs['new_password'], user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'new_password': exc.messages})
        return attrs


@api_view(['POST'])
def change_password(request):
    serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    request.user.set_password(serializer.validated_data['new_password'])
    request.user.save(update_fields=['password'])
    audit(request.user, request.user, 'password_changed')
    return Response({'status': 'password_updated'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle])
def verify_email(request):
    try:
        data = signing.loads(str(request.data.get('token', '')), salt='verify-email', max_age=86400)
        user = User.objects.get(pk=data['user'], email=data['email'], is_active=True)
    except (signing.BadSignature, User.DoesNotExist, KeyError, TypeError, ValueError):
        raise serializers.ValidationError('The verification token is invalid or expired.')
    user.email_verified = True
    user.save(update_fields=['email_verified'])
    audit(user, user, 'email_verified')
    return Response({'status': 'verified'})


@api_view(['POST'])
def resend_verification(request):
    if not request.user.email_verified:
        require(bool(request.user.email), 'This account has no email address.')
        verification_mail(request.user)
    return Response({'status': 'sent_if_needed'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle])
def password_reset(request):
    user = User.objects.filter(email__iexact=str(request.data.get('email', '')), is_active=True).exclude(email='').first()
    if user:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        send_mail('Reset your FreelanceHub password', f'Password reset UID: {uid}\nToken: {token}\nSubmit these with your new password.', settings.DEFAULT_FROM_EMAIL, [user.email])
    return Response({'status': 'sent_if_account_exists'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle])
def password_reset_confirm(request):
    try:
        uid = urlsafe_base64_decode(str(request.data.get('uid', ''))).decode()
        user = User.objects.get(pk=uid, is_active=True)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError, UnicodeDecodeError):
        raise serializers.ValidationError('Invalid reset request.')
    require(default_token_generator.check_token(user, str(request.data.get('token', ''))), 'Invalid or expired reset token.')
    password = serializers.CharField().run_validation(request.data.get('password'))
    try:
        password_validation.validate_password(password, user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({'password': exc.messages})
    user.set_password(password)
    user.save(update_fields=['password'])
    audit(user, user, 'password_reset')
    return Response({'status': 'password_updated'})


@api_view(['POST'])
def enable_capability(request):
    user = request.user
    require(not user.is_admin(), 'Administrative privileges are managed separately.')
    capability = request.data.get('capability')
    require(capability in ('client', 'freelancer'), 'Choose client or freelancer.')
    if not getattr(user, f'is_{capability}')():
        user.role = 'both'
        user.save(update_fields=['role'])
    if capability == 'client':
        ClientProfile.objects.get_or_create(user=user)
    else:
        FreelancerProfile.objects.get_or_create(user=user)
    audit(user, user, 'capability_enabled', capability=capability)
    return Response(AccountSerializer(user).data)
