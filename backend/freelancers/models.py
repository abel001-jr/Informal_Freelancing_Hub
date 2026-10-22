from django.db import models
from accounts.models import User


class FreelancerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='freelancer_profile')
    professional_title = models.CharField(max_length=100, blank=True)
    biography = models.TextField(blank=True)
    skills = models.TextField(blank=True, help_text='Comma-separated skills')
    experience = models.TextField(blank=True)
    education = models.TextField(blank=True)
    portfolio = models.TextField(blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    completed_projects = models.PositiveIntegerField(default=0)
    availability = models.BooleanField(default=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    website = models.URLField(blank=True)
    is_approved = models.BooleanField(default=True)

    def get_skills_list(self):
        if self.skills:
            return [s.strip() for s in self.skills.split(',') if s.strip()]
        return []

    def update_rating(self):
        from reviews.models import Review
        from workflow.models import Feedback
        reviews = Review.objects.filter(freelancer=self.user, is_visible=True)
        feedback = Feedback.objects.filter(recipient=self.user, project__freelancer=self.user, is_visible=True)
        total = (reviews.aggregate(total=models.Sum('rating'))['total'] or 0) + (feedback.aggregate(total=models.Sum('rating'))['total'] or 0)
        count = reviews.count() + feedback.count()
        self.rating = round(total / count, 2) if count else 0
        self.save(update_fields=['rating'])

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.professional_title}"
