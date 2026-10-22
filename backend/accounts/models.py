from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower


class User(AbstractUser):
    ROLE_ADMIN = 'admin'
    ROLE_FREELANCER = 'freelancer'
    ROLE_CLIENT = 'client'
    ROLE_BOTH = 'both'

    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Admin'),
        (ROLE_FREELANCER, 'Freelancer'),
        (ROLE_CLIENT, 'Client'),
        (ROLE_BOTH, 'Client and Freelancer'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_CLIENT)
    email_verified = models.BooleanField(default=False)
    active_workspace = models.CharField(max_length=20, choices=[('client', 'Client'), ('freelancer', 'Freelancer')], default='client')
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)
    cover_picture = models.ImageField(upload_to='profile_pictures/covers/', blank=True, null=True)
    location = models.CharField(max_length=100, blank=True)
    preferred_language = models.CharField(max_length=10, default='en', choices=[
        ('en', 'English'), ('kri', 'Krio'), ('fr', 'French'),
        ('ar', 'Arabic'), ('pt', 'Portuguese'), ('es', 'Spanish'),
    ])
    biography = models.TextField(blank=True, max_length=2000)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    class Meta(AbstractUser.Meta):
        constraints = [models.UniqueConstraint(Lower('email'), condition=~models.Q(email=''), name='unique_user_email_case_insensitive')]

    def is_admin(self):
        return self.is_active and (self.is_superuser or self.role == self.ROLE_ADMIN)

    def is_freelancer(self):
        return self.role in (self.ROLE_FREELANCER, self.ROLE_BOTH)

    def is_client(self):
        return self.role in (self.ROLE_CLIENT, self.ROLE_BOTH)

    def get_profile_picture_url(self):
        if self.profile_picture:
            return self.profile_picture.url
        return '/static/images/default_avatar.png'

    def __str__(self):
        return f"{self.username} ({self.role})"
