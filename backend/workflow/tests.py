from datetime import timedelta
from unittest.mock import patch
from django.core import mail, signing
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from accounts.models import User
from clients.models import ClientProfile
from freelancers.models import FreelancerProfile
from projects.models import Project
from services.models import Category, Service
from .models import Job, Proposal, ServiceRequest, Payment, AuditEvent, Feedback, Milestone


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class WorkflowTests(TestCase):
    def setUp(self):
        cache.clear()
        self.api = APIClient()
        self.client_user = self.user('client', 'client')
        self.freelancer = self.user('worker', 'freelancer')
        self.stranger = self.user('stranger', 'both')
        self.admin = self.user('moderator', 'admin')
        self.category = Category.objects.create(name='Development')
        self.deadline = timezone.localdate() + timedelta(days=10)
        self.service = Service.objects.create(freelancer=self.freelancer, category=self.category,
                                              title='Build a website', description='A website', price=100, status='approved')

    def test_freelancer_workspace_filters_and_counts_exclude_other_workspaces(self):
        own_draft = Service.objects.create(freelancer=self.freelancer, category=self.category,
                                          title='My draft', description='Draft', price=20, status='draft')
        Service.objects.create(freelancer=self.stranger, category=self.category,
                               title='Another listing', description='Public', price=30, status='approved')
        own_project = Project.objects.create(client=self.client_user, freelancer=self.freelancer,
                                              title='My work', description='Work', budget=100,
                                              deadline=self.deadline, status='active')
        Project.objects.create(client=self.freelancer, freelancer=self.stranger,
                               title='My client project', description='Work', budget=100,
                               deadline=self.deadline, status='active')
        job = Job.objects.create(client=self.freelancer, category=self.category, title='Job',
                                 description='Work', skills='Python', budget=100, deadline=self.deadline,
                                 deliverables='Website', status='published')
        own_proposal = Proposal.objects.create(job=job, freelancer=self.freelancer, amount=100,
                                               deadline=self.deadline, scope='Work', cover_letter='Hello')
        Proposal.objects.create(job=job, freelancer=self.stranger, amount=100,
                                deadline=self.deadline, scope='Work', cover_letter='Hello')
        self.api.force_authenticate(self.freelancer)
        response = self.api.get('/api/services/?mine=true')
        self.assertEqual(response.status_code, 200)
        self.assertEqual({item['id'] for item in response.data['results']}, {self.service.pk, own_draft.pk})
        response = self.api.get('/api/projects/?workspace=freelancer')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.data['results']], [own_project.pk])
        response = self.api.get('/api/proposals/?mine=true')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.data['results']], [own_proposal.pk])
        response = self.api.get('/api/dashboard/')
        self.assertEqual(response.data['owned_services'], 2)
        self.assertEqual(response.data['published_services'], 1)
        self.assertEqual(response.data['freelancer_active_projects'], 1)
        self.assertEqual(response.data['proposals'], 1)
        self.assertEqual(response.data['client_active_projects'], 1)
        response = self.api.get('/api/projects/?workspace=client')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['title'] for item in response.data['results']], ['My client project'])
        Job.objects.create(client=self.client_user, category=self.category, title='Another job',
                           description='Work', skills='Python', budget=100, deadline=self.deadline,
                           deliverables='Website', status='published')
        response = self.api.get('/api/jobs/?mine=true')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.data['results']], [job.pk])
        external_service = Service.objects.create(freelancer=self.stranger, category=self.category,
                                                   title='External service', description='Work', price=100, status='approved')
        own_request = ServiceRequest.objects.create(service=external_service, client=self.freelancer,
                                                     title='My request', amount=100, deadline=self.deadline, scope='Work')
        incoming = ServiceRequest.objects.create(service=self.service, client=self.client_user,
                                                  title='An incoming request', amount=100, deadline=self.deadline, scope='Work')
        response = self.api.get('/api/service-requests/?workspace=client')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.data['results']], [own_request.pk])
        response = self.api.get('/api/service-requests/?workspace=freelancer')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.data['results']], [incoming.pk])
        self.api.force_authenticate(None)
        response = self.api.get('/api/services/?mine=true')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 0)

    def user(self, username, role):
        user = User.objects.create_user(username=username, email=f'{username}@example.com', password='SaferPass!6372',
                                        role=role, first_name='First', last_name='Last', location='Freetown',
                                        email_verified=True, terms_accepted_at=timezone.now())
        if user.is_client():
            ClientProfile.objects.create(user=user)
        if user.is_freelancer():
            FreelancerProfile.objects.create(user=user, professional_title='Developer', skills='Python')
        return user

    def post(self, user, url, data=None, expected=200):
        self.api.force_authenticate(user)
        response = self.api.post('/api/' + url, data or {}, format='json')
        self.assertEqual(response.status_code, expected, response.data)
        return response.data

    def request_project(self):
        data = self.post(self.client_user, 'service-requests/', {
            'service': self.service.pk, 'title': 'My website', 'scope': 'Build three pages',
            'amount': '100.00', 'deadline': str(self.deadline),
        }, 201)
        accepted = self.post(self.freelancer, f"service-requests/{data['id']}/respond/", {'action': 'confirm'})
        project = Project.objects.get(pk=accepted['project'])
        self.assertEqual(project.status, 'pending_activation')
        self.assertEqual(project.origin, 'service')
        return project

    def transition(self, user, project, action, expected=200):
        return self.post(user, f'projects/{project.pk}/transition/', {'action': action, 'note': 'Delivery or review details'}, expected)

    def test_service_project_delivery_settlement_and_two_way_feedback(self):
        project = self.request_project()
        self.transition(self.client_user, project, 'complete', 400)
        self.transition(self.freelancer, project, 'activate', 403)
        self.transition(self.client_user, project, 'activate')
        self.transition(self.client_user, project, 'submit', 403)
        self.transition(self.freelancer, project, 'submit')
        self.transition(self.client_user, project, 'request_revision')
        self.transition(self.freelancer, project, 'submit')
        self.transition(self.client_user, project, 'approve')
        self.transition(self.client_user, project, 'complete', 400)
        payment = self.post(self.client_user, 'payments/', {'project': project.pk, 'amount': '100.00', 'reference': 'BANK-001'}, 201)
        self.post(self.client_user, f"payments/{payment['id']}/reconcile/", {'decision': 'verify', 'reason': 'Paid'}, 403)
        self.post(self.admin, f"payments/{payment['id']}/reconcile/", {'decision': 'verify', 'reason': 'Matched bank statement'})
        self.transition(self.client_user, project, 'complete')
        self.transition(self.client_user, project, 'complete', 400)
        self.post(self.client_user, 'feedback/', {'project': project.pk, 'rating': 5, 'comment': 'Excellent'}, 201)
        self.post(self.freelancer, 'feedback/', {'project': project.pk, 'rating': 4}, 201)
        self.post(self.client_user, 'feedback/', {'project': project.pk, 'rating': 5}, 400)
        self.post(self.stranger, 'feedback/', {'project': project.pk, 'rating': 5}, 403)
        profile = FreelancerProfile.objects.get(user=self.freelancer)
        self.assertEqual(profile.completed_projects, 1)
        self.assertEqual(profile.rating, 5)
        self.assertTrue(project.history.filter(action='request_revision').exists())
        self.assertTrue(AuditEvent.objects.filter(action='payment_reconciled').exists())

    def test_job_proposal_negotiation_and_exclusive_hiring(self):
        job = self.post(self.client_user, 'jobs/', {
            'category': self.category.pk, 'title': 'New site', 'description': 'Build a site',
            'skills': 'Python', 'budget': '200.00', 'deadline': str(self.deadline), 'deliverables': 'A working site',
        }, 201)
        self.post(self.client_user, f"jobs/{job['id']}/publish/")
        self.post(self.client_user, f"jobs/{job['id']}/moderate/", {'decision': 'approve', 'reason': 'Fine'}, 403)
        self.post(self.admin, f"jobs/{job['id']}/moderate/", {'decision': 'approve', 'reason': 'Reviewed listing'})
        proposal = {'job': job['id'], 'amount': '180.00', 'deadline': str(self.deadline), 'scope': 'Build all pages', 'cover_letter': 'I can build this'}
        first = self.post(self.freelancer, 'proposals/', proposal, 201)
        self.post(self.freelancer, 'proposals/', proposal, 400)
        other = self.post(self.stranger, 'proposals/', proposal, 201)
        self.post(self.freelancer, f"proposals/{first['id']}/respond/", {'action': 'select'}, 403)
        self.post(self.client_user, f"proposals/{first['id']}/respond/", {'action': 'select'})
        self.post(self.client_user, f"proposals/{other['id']}/respond/", {'action': 'select'}, 400)
        terms = {'action': 'counteroffer', 'amount': '190.00', 'deadline': str(self.deadline), 'scope': 'Extra page'}
        self.post(self.freelancer, f"proposals/{first['id']}/respond/", terms)
        accepted = self.post(self.client_user, f"proposals/{first['id']}/respond/", {'action': 'confirm'})
        project = Project.objects.get(pk=accepted['project'])
        self.assertEqual(project.origin, 'job')
        self.assertEqual(project.status, 'pending_activation')
        self.assertEqual(project.budget, 190)
        self.assertEqual(Job.objects.get(pk=job['id']).status, 'closed')
        self.assertEqual(Proposal.objects.get(pk=other['id']).status, 'rejected')
        self.post(self.freelancer, f"proposals/{first['id']}/respond/", {'action': 'confirm'}, 400)

    def test_service_counteroffer_resets_other_partys_confirmation(self):
        offer = ServiceRequest.objects.create(client=self.client_user, service=self.service, title='Work', amount=100,
                                               scope='Scope', deadline=self.deadline, client_confirmed=True)
        changed = self.post(self.freelancer, f'service-requests/{offer.pk}/respond/', {
            'action': 'counteroffer', 'amount': '120.00', 'deadline': str(self.deadline), 'scope': 'New scope',
        })
        self.assertFalse(changed['client_confirmed'])
        self.assertTrue(changed['freelancer_confirmed'])
        self.assertIsNone(changed['project'])
        self.post(self.freelancer, f'service-requests/{offer.pk}/respond/', {'action': 'confirm'}, 400)
        self.post(self.client_user, f'service-requests/{offer.pk}/respond/', {'action': 'confirm'})

    def test_unverified_or_incomplete_profiles_cannot_publish(self):
        self.freelancer.email_verified = False
        self.freelancer.save()
        self.post(self.freelancer, 'services/', {'title': 'Test', 'description': 'Test', 'category_id': self.category.pk, 'price': '10', 'delivery_days': 2}, 400)
        self.freelancer.email_verified = True
        self.freelancer.location = ''
        self.freelancer.save()
        self.post(self.freelancer, 'services/', {'title': 'Test', 'description': 'Test', 'category_id': self.category.pk, 'price': '10', 'delivery_days': 2}, 400)

    def test_owner_checks_and_private_project_records(self):
        self.api.force_authenticate(self.stranger)
        self.assertEqual(self.api.patch(f'/api/services/{self.service.pk}/', {'title': 'Hacked'}, format='json').status_code, 403)
        profile = FreelancerProfile.objects.get(user=self.freelancer)
        self.assertEqual(self.api.patch(f'/api/freelancers/{profile.pk}/', {'biography': 'Hacked'}, format='json').status_code, 403)
        project = self.request_project()
        self.api.force_authenticate(self.stranger)
        self.assertEqual(self.api.get(f'/api/projects/{project.pk}/').status_code, 404)
        self.post(self.stranger, 'tasks/', {'project': project.pk, 'title': 'Hacked'}, 403)
        self.post(self.stranger, 'payments/', {'project': project.pk, 'amount': 1, 'reference': 'BAD'}, 400)
        self.post(self.stranger, 'projects/', {}, 405)

    def test_service_moderation_sees_pending_records(self):
        service = self.post(self.freelancer, 'services/', {
            'category_id': self.category.pk, 'title': 'New service', 'description': 'Details', 'price': 50, 'delivery_days': 2,
        }, 201)
        self.assertEqual(service['status'], 'draft')
        self.post(self.freelancer, f"services/{service['id']}/publish/")
        self.post(self.admin, f"services/{service['id']}/approve/", {'reason': 'Reviewed'})
        self.api.force_authenticate(None)
        self.assertEqual(self.api.get(f"/api/services/{service['id']}/").status_code, 200)

    def test_dispute_freezes_project_and_requires_admin_resolution(self):
        project = self.request_project()
        self.transition(self.client_user, project, 'activate')
        dispute = self.post(self.freelancer, 'disputes/', {'project': project.pk, 'description': 'Scope disagreement'}, 201)
        self.transition(self.freelancer, project, 'submit', 400)
        self.post(self.client_user, 'dispute-responses/', {'dispute': dispute['id'], 'message': 'My response'}, 201)
        self.post(self.stranger, 'dispute-responses/', {'dispute': dispute['id'], 'message': 'Hacked'}, 403)
        self.post(self.client_user, f"disputes/{dispute['id']}/resolve/", {'outcome': 'resume', 'reason': 'Agreed'}, 403)
        self.post(self.admin, f"disputes/{dispute['id']}/resolve/", {'outcome': 'resume', 'reason': 'Scope clarified'})
        project.refresh_from_db()
        self.assertEqual(project.status, 'active')

    def test_payments_remain_pending_and_overpayment_is_rejected(self):
        project = self.request_project()
        payment = self.post(self.client_user, 'payments/', {'project': project.pk, 'amount': '110.00', 'reference': 'OVER', 'status': 'verified'}, 201)
        self.assertEqual(payment['status'], 'pending')
        self.post(self.admin, f"payments/{payment['id']}/reconcile/", {'decision': 'verify', 'reason': 'Bank checked'}, 400)
        self.api.force_authenticate(self.client_user)
        self.assertEqual(self.api.patch(f"/api/payments/{payment['id']}/", {'status': 'verified'}, format='json').status_code, 405)

    def test_tasks_and_milestones_gate_completion(self):
        project = self.request_project()
        milestone = self.post(self.client_user, 'milestones/', {'project': project.pk, 'title': 'First release', 'description': 'Release', 'amount': 100, 'due_date': str(self.deadline)}, 201)
        self.post(self.client_user, 'milestones/', {'project': project.pk, 'title': 'Over budget', 'description': 'More', 'amount': 1, 'due_date': str(self.deadline)}, 400)
        self.transition(self.client_user, project, 'activate')
        self.post(self.freelancer, f"milestones/{milestone['id']}/transition/", {'action': 'submit'})
        self.post(self.client_user, f"milestones/{milestone['id']}/transition/", {'action': 'approve'})
        self.assertEqual(Milestone.objects.get(pk=milestone['id']).status, 'approved')

    def test_message_recipient_and_project_permissions(self):
        project = self.request_project()
        msg = self.post(self.client_user, 'messages/', {'receiver_id': self.freelancer.pk, 'project': project.pk, 'message': 'Hello'}, 201)
        self.post(self.client_user, f"messages/{msg['id']}/mark_read/", {}, 403)
        self.post(self.freelancer, f"messages/{msg['id']}/mark_read/")
        self.post(self.stranger, 'messages/', {'receiver_id': self.freelancer.pk, 'project': project.pk, 'message': 'Private'}, 403)

    def test_dual_role_workspace_and_capability(self):
        self.api.force_authenticate(self.client_user)
        response = self.api.patch('/api/auth/me/', {'active_workspace': 'freelancer'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.post(self.client_user, 'auth/enable-capability/', {'capability': 'freelancer'})
        self.client_user.refresh_from_db()
        self.assertTrue(self.client_user.is_freelancer())
        self.assertTrue(self.client_user.is_client())
        self.assertTrue(FreelancerProfile.objects.filter(user=self.client_user).exists())

    def test_public_identity_does_not_leak_email(self):
        self.api.force_authenticate(None)
        data = self.api.get('/api/services/').data['results'][0]
        self.assertNotIn('email', data['freelancer'])
        self.assertNotIn('is_active', data['freelancer'])

    def test_private_uploads_are_not_served_under_media(self):
        self.api.force_authenticate(None)
        self.assertEqual(self.api.get('/media/project_attachments/private.txt').status_code, 404)

    def test_support_and_audit_permissions(self):
        ticket = self.post(self.client_user, 'support-tickets/', {'subject': 'Need help', 'description': 'Question'}, 201)
        self.api.force_authenticate(self.stranger)
        self.assertEqual(self.api.get(f"/api/support-tickets/{ticket['id']}/").status_code, 404)
        self.assertEqual(self.api.get('/api/audit-events/').status_code, 403)
        self.post(self.admin, f"support-tickets/{ticket['id']}/resolve/", {'response': 'Here is help'})

    def test_registration_verification_password_validation_and_admin_escalation(self):
        data = {'username': 'newuser', 'email': 'new@example.com', 'password': 'NewPassword!6372',
                'first_name': 'New', 'last_name': 'Person', 'role': 'both', 'location': 'Freetown', 'accept_terms': True}
        with self.captureOnCommitCallbacks(execute=True):
            self.post(None, 'auth/register/', data, 201)
        user = User.objects.get(username='newuser')
        self.assertFalse(user.email_verified)
        self.assertTrue(ClientProfile.objects.filter(user=user).exists())
        self.assertTrue(FreelancerProfile.objects.filter(user=user).exists())
        token = signing.dumps({'user': user.pk, 'email': user.email}, salt='verify-email')
        self.post(None, 'auth/verify-email/', {'token': token})
        user.refresh_from_db()
        self.assertTrue(user.email_verified)
        self.post(None, 'auth/verify-email/', {'token': token + 'tamper'}, 400)
        data.update(username='fakeadmin', email='admin2@example.com', role='admin')
        self.post(None, 'auth/register/', data, 400)
        self.assertTrue(mail.outbox)

    @override_settings(MARKETPLACE_MODERATE_LISTINGS=False)
    def test_configurable_listing_moderation(self):
        obj = Service.objects.create(freelancer=self.freelancer, category=self.category, title='Test', description='Test', price=10, status='draft')
        response = self.post(self.freelancer, f'services/{obj.pk}/publish/')
        self.assertEqual(response['status'], 'approved')

    @override_settings(MARKETPLACE_REQUIRE_PAYMENT_TO_ACTIVATE=True)
    def test_payment_activation_gate_is_configurable(self):
        project = self.request_project()
        self.transition(self.client_user, project, 'activate', 400)

    def test_rejected_request_cannot_be_confirmed(self):
        offer = ServiceRequest.objects.create(client=self.client_user, service=self.service, title='Work', amount=100,
                                               scope='Scope', deadline=self.deadline, client_confirmed=True)
        self.post(self.freelancer, f'service-requests/{offer.pk}/respond/', {'action': 'reject'})
        self.post(self.freelancer, f'service-requests/{offer.pk}/respond/', {'action': 'confirm'}, 400)
        self.assertEqual(Project.objects.count(), 0)

    def test_rejecting_unselected_proposal_does_not_reopen_hiring(self):
        job = Job.objects.create(client=self.client_user, category=self.category, title='Work', description='Work',
                                 skills='Python', budget=100, deadline=self.deadline, deliverables='Site', status='hiring')
        Proposal.objects.create(job=job, freelancer=self.freelancer, cover_letter='Hi', amount=100,
                                deadline=self.deadline, scope='Work', status='selected')
        other = Proposal.objects.create(job=job, freelancer=self.stranger, cover_letter='Hi', amount=100,
                                         deadline=self.deadline, scope='Work')
        self.post(self.client_user, f'proposals/{other.pk}/respond/', {'action': 'reject'})
        job.refresh_from_db()
        self.assertEqual(job.status, 'hiring')

    def test_feedback_moderation_recalculates_rating(self):
        project = self.request_project()
        project.status = 'completed'
        project.save()
        review = self.post(self.client_user, 'feedback/', {'project': project.pk, 'rating': 5}, 201)
        self.post(self.admin, f"feedback/{review['id']}/moderate/", {'is_visible': False, 'reason': 'Policy violation'})
        profile = FreelancerProfile.objects.get(user=self.freelancer)
        self.assertEqual(profile.rating, 0)
        self.api.force_authenticate(None)
        self.assertEqual(self.api.get('/api/feedback/').data['count'], 0)

    def test_legacy_review_cannot_duplicate_feedback(self):
        project = self.request_project()
        project.status = 'completed'
        project.save()
        self.post(self.client_user, 'feedback/', {'project': project.pk, 'rating': 5}, 201)
        self.post(self.client_user, 'reviews/', {'project': project.pk, 'rating': 5, 'comment': 'Again'}, 400)

    def test_private_attachment_download_requires_participant(self):
        import tempfile
        from django.core.files.uploadedfile import SimpleUploadedFile
        project = self.request_project()
        with tempfile.TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory):
            self.api.force_authenticate(self.client_user)
            upload = self.api.post('/api/attachments/', {'project': project.pk, 'file': SimpleUploadedFile('delivery.txt', b'Private delivery')}, format='multipart')
            self.assertEqual(upload.status_code, 201, upload.data)
            path = upload.data['download_url']
            self.assertNotIn('file', upload.data)
            self.api.force_authenticate(self.stranger)
            self.assertEqual(self.api.get(path).status_code, 404)
            self.api.force_authenticate(self.freelancer)
            response = self.api.get(path)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(b''.join(response.streaming_content), b'Private delivery')
            response.close()

    def test_jwt_and_suspension(self):
        self.api.force_authenticate(None)
        response = self.api.post('/api/auth/token/', {'username': self.client_user.username, 'password': 'SaferPass!6372'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.api.credentials(HTTP_AUTHORIZATION='Bearer ' + response.data['access'])
        self.assertEqual(self.api.get('/api/auth/me/').status_code, 200)
        self.client_user.is_active = False
        self.client_user.save()
        self.assertEqual(self.api.get('/api/auth/me/').status_code, 401)

    def test_password_reset_validates_password_and_revokes_old_token(self):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        self.api.force_authenticate(None)
        login = self.api.post('/api/auth/token/', {'username': self.client_user.username, 'password': 'SaferPass!6372'}, format='json')
        uid = urlsafe_base64_encode(force_bytes(self.client_user.pk))
        token = default_token_generator.make_token(self.client_user)
        self.post(None, 'auth/password-reset-confirm/', {'uid': uid, 'token': token, 'password': '123'}, 400)
        self.post(None, 'auth/password-reset-confirm/', {'uid': uid, 'token': token, 'password': 'Replacement!93842'})
        self.api.credentials(HTTP_AUTHORIZATION='Bearer ' + login.data['access'])
        self.assertEqual(self.api.get('/api/auth/me/').status_code, 401)

    def test_refund_required_before_dispute_cancellation(self):
        project = self.request_project()
        payment = self.post(self.client_user, 'payments/', {'project': project.pk, 'amount': 100, 'reference': 'REFUND-001'}, 201)
        self.post(self.admin, f"payments/{payment['id']}/reconcile/", {'decision': 'verify', 'reason': 'Matched bank receipt'})
        dispute = self.post(self.client_user, 'disputes/', {'project': project.pk, 'description': 'Cancel agreement'}, 201)
        self.post(self.admin, f"disputes/{dispute['id']}/resolve/", {'outcome': 'cancel', 'reason': 'Cancellation approved'}, 400)
        self.post(self.admin, f"payments/{payment['id']}/reconcile/", {'decision': 'refund', 'reason': 'Refund receipt reconciled'})
        self.post(self.admin, f"disputes/{dispute['id']}/resolve/", {'outcome': 'cancel', 'reason': 'Refund and cancellation confirmed'})
