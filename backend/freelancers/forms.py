from django import forms
from .models import FreelancerProfile


class FreelancerProfileForm(forms.ModelForm):
    class Meta:
        model = FreelancerProfile
        fields = [
            'professional_title', 'biography', 'skills',
            'experience', 'education', 'portfolio',
            'availability', 'hourly_rate', 'website'
        ]
        widgets = {
            'professional_title': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Full Stack Developer'}),
            'biography': forms.Textarea(attrs={'class': 'form-control', 'rows': 4, 'placeholder': 'Tell clients about yourself...'}),
            'skills': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Python, Django, JavaScript'}),
            'experience': forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Describe your work experience...'}),
            'education': forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Your educational background...'}),
            'portfolio': forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Portfolio links or descriptions...'}),
            'hourly_rate': forms.NumberInput(attrs={'class': 'form-control', 'placeholder': 'e.g. 80000'}),
            'website': forms.URLInput(attrs={'class': 'form-control', 'placeholder': 'https://yourwebsite.com'}),
        }
