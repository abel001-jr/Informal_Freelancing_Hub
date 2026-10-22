from io import BytesIO
from PIL import Image
from django.core import mail, signing
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from accounts.models import User
from freelancers.models import FreelancerProfile


@override_settings(STORAGES={'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'}})
class ProfileSetupTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='profile-member', email='member@example.com',
                                             password='OriginalPassword!7296', role='both', email_verified=True)
        FreelancerProfile.objects.create(user=self.user)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_profile_saves_personal_details_without_changing_system_fields(self):
        original_date = self.user.date_joined
        response = self.client.patch('/api/auth/me/', {
            'first_name': 'Isha', 'last_name': 'Sesay', 'phone': '+232 88765423',
            'location': 'Freetown', 'preferred_language': 'kri', 'biography': 'Independent designer.',
            'role': 'admin', 'is_admin': True, 'is_active': False, 'email_verified': False,
            'date_joined': '2000-01-01T00:00:00Z',
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Isha')
        self.assertEqual(self.user.phone, '+232 88765423')
        self.assertEqual(self.user.preferred_language, 'kri')
        self.assertEqual(self.user.biography, 'Independent designer.')
        self.assertEqual(self.user.freelancer_profile.biography, 'Independent designer.')
        self.assertEqual(self.user.role, 'both')
        self.assertTrue(self.user.is_active)
        self.assertTrue(self.user.email_verified)
        self.assertEqual(self.user.date_joined, original_date)
        self.assertFalse(response.data['is_admin'])

    def test_email_change_resets_verification_and_sends_new_token(self):
        old_token = signing.dumps({'user': self.user.pk, 'email': self.user.email}, salt='verify-email')
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch('/api/auth/me/', {'email': 'new@example.com'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['email_verified'])
        self.assertEqual(mail.outbox[-1].to, ['new@example.com'])
        response = self.client.post('/api/auth/verify-email/', {'token': old_token}, format='json')
        self.assertEqual(response.status_code, 400)
        token = signing.dumps({'user': self.user.pk, 'email': 'new@example.com'}, salt='verify-email')
        response = self.client.post('/api/auth/verify-email/', {'token': token}, format='json')
        self.assertEqual(response.status_code, 200)

    def test_duplicate_email_is_rejected(self):
        User.objects.create_user(username='another', email='taken@example.com')
        response = self.client.patch('/api/auth/me/', {'email': 'TAKEN@example.com'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.data)

    def test_valid_photo_upload_and_invalid_file_rejection(self):
        output = BytesIO()
        Image.new('RGB', (10, 10), 'purple').save(output, format='PNG')
        response = self.client.patch('/api/auth/me/', {
            'profile_picture': SimpleUploadedFile('avatar.png', output.getvalue(), content_type='image/png'),
        }, format='multipart')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn('/media/profile_pictures/', response.data['profile_picture'])
        response = self.client.patch('/api/auth/me/', {
            'profile_picture': SimpleUploadedFile('fake.png', b'not an image', content_type='image/png'),
        }, format='multipart')
        self.assertEqual(response.status_code, 400)

    def test_cover_upload_and_professional_settings(self):
        output = BytesIO()
        Image.new('RGB', (30, 10), 'purple').save(output, format='PNG')
        response = self.client.patch('/api/auth/me/', {
            'cover_picture': SimpleUploadedFile('cover.png', output.getvalue(), content_type='image/png'),
        }, format='multipart')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn('/media/profile_pictures/covers/', response.data['cover_picture'])
        profile_id = response.data['freelancer_profile']['id']
        response = self.client.patch(f'/api/freelancers/{profile_id}/', {
            'professional_title': 'Brand designer', 'skills': 'Branding, Design',
            'hourly_rate': '125.50', 'availability': True,
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.data['freelancer_profile']['professional_title'], 'Brand designer')
        response = self.client.patch('/api/auth/me/', {
            'cover_picture': SimpleUploadedFile('invalid.png', b'not an image', content_type='image/png'),
        }, format='multipart')
        self.assertEqual(response.status_code, 400)

    def test_password_change_checks_current_password_and_revokes_old_jwt(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        old_access = str(RefreshToken.for_user(self.user).access_token)
        response = self.client.post('/api/auth/change-password/', {
            'current_password': 'wrong', 'new_password': 'UpdatedPassword!49362',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        response = self.client.post('/api/auth/change-password/', {
            'current_password': 'OriginalPassword!7296', 'new_password': 'UpdatedPassword!49362',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('UpdatedPassword!49362'))
        self.client.force_authenticate(None)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {old_access}')
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_profile_and_password_require_authentication(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)
        self.assertEqual(self.client.post('/api/auth/change-password/', {}, format='json').status_code, 401)
