from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import User
from services.models import Category, Service


class FrontendIntegrationTests(TestCase):
    def test_public_health(self):
        response = APIClient().get('/api/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok', 'database': 'connected'})

    def test_marketplace_only_returns_approved_services(self):
        user = User.objects.create_user(username='freelancer', role='freelancer')
        category = Category.objects.create(name='Development')
        for status in ['pending', 'approved', 'rejected']:
            Service.objects.create(freelancer=user, category=category, title=status,
                                   description='A service', price=100, status=status)
        response = APIClient().get('/api/services/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['title'] for item in response.json()['results']], ['approved'])


class AuthenticationSetupTests(TestCase):
    def test_registration_saves_phone_and_terms_for_each_public_role(self):
        client = APIClient()
        for role in ['client', 'freelancer', 'both']:
            with self.subTest(role=role):
                response = client.post('/api/auth/register/', {
                    'username': f'new_{role}', 'email': f'{role}@example.com',
                    'first_name': 'New', 'last_name': 'Member', 'phone': '+232 88765423',
                    'role': role, 'password': 'Unique!Account49327', 'accept_terms': True,
                }, format='json')
                self.assertEqual(response.status_code, 201, response.data)
                user = User.objects.get(username=f'new_{role}')
                self.assertEqual(user.phone, '+232 88765423')
                self.assertIsNotNone(user.terms_accepted_at)
                self.assertFalse(user.email_verified)
                self.assertTrue(user.check_password('Unique!Account49327'))
                self.assertNotIn('password', response.data)

    def test_registration_rejects_missing_or_declined_terms(self):
        payload = {
            'username': 'no_terms', 'email': 'no_terms@example.com',
            'first_name': 'New', 'last_name': 'Member', 'role': 'client',
            'password': 'Unique!Account49327',
        }
        client = APIClient()
        response = client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('accept_terms', response.data)
        response = client.post('/api/auth/register/', {**payload, 'accept_terms': False}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username='no_terms').exists())

    def test_account_identifies_administrators_without_allowing_privilege_updates(self):
        client = APIClient()
        for username, role, superuser, expected in [
            ('ordinary', 'client', False, False),
            ('moderator', 'admin', False, True),
            ('superuser', 'client', True, True),
        ]:
            with self.subTest(username=username):
                user = User.objects.create_user(username=username, role=role, is_superuser=superuser)
                client.force_authenticate(user)
                response = client.get('/api/auth/me/')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data['is_admin'], expected)
                response = client.patch('/api/auth/me/', {'is_admin': not expected}, format='json')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data['is_admin'], expected)

    def test_jwt_login_refresh_and_authenticated_account(self):
        user = User.objects.create_user(username='api-user', password='SetupTest!92471')
        client = APIClient()
        login = client.post('/api/auth/token/', {
            'username': user.username, 'password': 'SetupTest!92471',
        }, format='json')
        self.assertEqual(login.status_code, 200)
        refresh = client.post('/api/auth/token/refresh/', {
            'refresh': login.data['refresh'],
        }, format='json')
        self.assertEqual(refresh.status_code, 200)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.data['access']}")
        account = client.get('/api/auth/me/')
        self.assertEqual(account.status_code, 200)

    def test_current_account_requires_authentication(self):
        self.assertEqual(APIClient().get('/api/auth/me/').status_code, 401)
