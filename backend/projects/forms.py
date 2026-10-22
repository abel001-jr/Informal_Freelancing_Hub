from django import forms
from .models import Project, ProjectAttachment


class ProjectRequestForm(forms.ModelForm):
    class Meta:
        model = Project
        fields = ['title', 'description', 'budget', 'deadline', 'requirements']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'budget': forms.NumberInput(attrs={'class': 'form-control', 'min': '1', 'placeholder': 'e.g. 150000'}),
            'deadline': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'requirements': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }


class ProjectAttachmentForm(forms.ModelForm):
    class Meta:
        model = ProjectAttachment
        fields = ['file', 'description']
        widgets = {
            'file': forms.FileInput(attrs={'class': 'form-control'}),
            'description': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Brief description of the file'}),
        }
