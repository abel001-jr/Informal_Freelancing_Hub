"""
Management command to seed the database with sample data.
Run: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from accounts.models import User
from freelancers.models import FreelancerProfile
from clients.models import ClientProfile
from services.models import Category, Service
from projects.models import Project
from reviews.models import Review
from notifications.models import Notification


class Command(BaseCommand):
    help = 'Seeds the database with sample data'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.NOTICE('Seeding database...'))

        # ── Categories ──────────────────────────────────────────────────
        categories_data = [
            ('Web Development', 'bi-code-slash', 'Build websites, web apps and APIs'),
            ('Graphic Design', 'bi-palette', 'Logos, branding, print and digital design'),
            ('Mobile Development', 'bi-phone', 'iOS and Android applications'),
            ('Writing & Content', 'bi-pencil', 'Copywriting, blogging, technical writing'),
            ('Digital Marketing', 'bi-megaphone', 'SEO, social media, ads and campaigns'),
            ('Video & Animation', 'bi-camera-video', 'Video editing, motion graphics, 2D/3D'),
            ('Data & Analytics', 'bi-bar-chart', 'Data analysis, BI, machine learning'),
            ('Cybersecurity', 'bi-shield-lock', 'Penetration testing, security audits'),
            ('Photography', 'bi-camera', 'Product, portrait and event photography'),
            ('Translation', 'bi-translate', 'Document and website translation'),
            ('Education & Tutoring', 'bi-book', 'Online tutoring and course creation'),
            ('Programming', 'bi-terminal', 'Scripts, automation and custom software'),
        ]
        categories = {}
        for name, icon, desc in categories_data:
            cat, _ = Category.objects.get_or_create(name=name, defaults={'icon': icon, 'description': desc})
            categories[name] = cat
        self.stdout.write(f'  ✓ {len(categories)} categories')

        # ── Admin ────────────────────────────────────────────────────────
        if not User.objects.filter(username='admin').exists():
            admin = User.objects.create_superuser(
                username='admin', email='admin@freelancehub.com',
                password='Admin@123', first_name='Platform', last_name='Admin',
                role=User.ROLE_ADMIN
            )
        else:
            admin = User.objects.get(username='admin')
        self.stdout.write('  ✓ Admin: admin / Admin@123')

        # ── Freelancers ──────────────────────────────────────────────────
        freelancers_data = [
            {
                'username': 'john_dev', 'email': 'john@example.com', 'password': 'Pass@1234',
                'first_name': 'John', 'last_name': 'Doe', 'location': 'Freetown, Sierra Leone',
                'title': 'Full Stack Django Developer',
                'bio': 'Professional full-stack developer specialising in Python/Django and modern JavaScript frameworks. 5+ years building scalable web applications.',
                'skills': 'Python, Django, JavaScript, React, PostgreSQL, HTML, CSS, REST API',
                'experience': 'Senior Developer at TechCorp (2020-2024)\nFreelance Web Developer (2018-2020)',
                'education': 'BSc Computer Science, Fourah Bay College (2018)',
                'hourly_rate': 80000, 'rating': 4.8, 'completed': 25,
            },
            {
                'username': 'jane_design', 'email': 'jane@example.com', 'password': 'Pass@1234',
                'first_name': 'Jane', 'last_name': 'Smith', 'location': 'Accra, Ghana',
                'title': 'Creative Graphic Designer',
                'bio': 'Passionate graphic designer with an eye for detail. Specialising in brand identity, UI/UX design and digital illustration.',
                'skills': 'Adobe Photoshop, Illustrator, Figma, UI/UX, Branding, Logo Design',
                'experience': 'Lead Designer at CreativeHub (2019-2024)',
                'education': 'BA Visual Communication, KNUST (2019)',
                'hourly_rate': 65000, 'rating': 4.9, 'completed': 42,
            },
            {
                'username': 'mike_mobile', 'email': 'mike@example.com', 'password': 'Pass@1234',
                'first_name': 'Michael', 'last_name': 'Johnson', 'location': 'Lagos, Nigeria',
                'title': 'Mobile App Developer (iOS & Android)',
                'bio': 'Experienced mobile developer building high-performance cross-platform apps using Flutter and React Native.',
                'skills': 'Flutter, React Native, Swift, Kotlin, Firebase, REST API',
                'experience': 'Mobile Developer at AppFactory (2021-2024)',
                'education': 'BSc Software Engineering, University of Lagos (2021)',
                'hourly_rate': 90000, 'rating': 4.7, 'completed': 18,
            },
            {
                'username': 'sarah_write', 'email': 'sarah@example.com', 'password': 'Pass@1234',
                'first_name': 'Sarah', 'last_name': 'Williams', 'location': 'Nairobi, Kenya',
                'title': 'SEO Content Writer & Copywriter',
                'bio': 'Professional writer crafting compelling, SEO-optimised content that drives traffic and converts readers into customers.',
                'skills': 'Content Writing, SEO, Copywriting, Blog Writing, Technical Writing',
                'experience': 'Senior Content Strategist at ContentPro (2020-2024)',
                'education': 'BA English Literature, University of Nairobi (2020)',
                'hourly_rate': 50000, 'rating': 4.6, 'completed': 67,
            },
        ]

        freelancers = {}
        for fd in freelancers_data:
            if not User.objects.filter(username=fd['username']).exists():
                user = User.objects.create_user(
                    username=fd['username'], email=fd['email'], password=fd['password'],
                    first_name=fd['first_name'], last_name=fd['last_name'],
                    role=User.ROLE_FREELANCER, location=fd['location']
                )
            else:
                user = User.objects.get(username=fd['username'])
            profile, _ = FreelancerProfile.objects.get_or_create(user=user)
            profile.professional_title = fd['title']
            profile.biography = fd['bio']
            profile.skills = fd['skills']
            profile.experience = fd['experience']
            profile.education = fd['education']
            profile.hourly_rate = fd['hourly_rate']
            profile.rating = fd['rating']
            profile.completed_projects = fd['completed']
            profile.save()
            freelancers[fd['username']] = user
        self.stdout.write(f'  ✓ {len(freelancers)} freelancers')

        # ── Clients ──────────────────────────────────────────────────────
        clients_data = [
            {
                'username': 'mary_client', 'email': 'mary@example.com', 'password': 'Pass@1234',
                'first_name': 'Mary', 'last_name': 'Brown', 'location': 'London, UK',
                'company': 'BrownTech Ltd',
            },
            {
                'username': 'alex_client', 'email': 'alex@example.com', 'password': 'Pass@1234',
                'first_name': 'Alex', 'last_name': 'Davis', 'location': 'New York, USA',
                'company': 'Davis Ventures',
            },
            {
                'username': 'linda_client', 'email': 'linda@example.com', 'password': 'Pass@1234',
                'first_name': 'Linda', 'last_name': 'Martin', 'location': 'Toronto, Canada',
                'company': '',
            },
        ]
        clients = {}
        for cd in clients_data:
            if not User.objects.filter(username=cd['username']).exists():
                user = User.objects.create_user(
                    username=cd['username'], email=cd['email'], password=cd['password'],
                    first_name=cd['first_name'], last_name=cd['last_name'],
                    role=User.ROLE_CLIENT, location=cd['location']
                )
            else:
                user = User.objects.get(username=cd['username'])
            profile, _ = ClientProfile.objects.get_or_create(user=user)
            profile.company_name = cd['company']
            profile.save()
            clients[cd['username']] = user
        self.stdout.write(f'  ✓ {len(clients)} clients')

        # ── Services ─────────────────────────────────────────────────────
        services_data = [
            {
                'freelancer': 'john_dev', 'category': 'Web Development',
                'title': 'I will build a professional Django web application',
                'desc': 'I will develop a fully functional, responsive Django web application tailored to your business needs. Includes custom models, authentication, admin panel and deployment.',
                'skills': 'Python, Django, PostgreSQL, HTML, CSS, JavaScript',
                'price': 350000, 'days': 7,
            },
            {
                'freelancer': 'john_dev', 'category': 'Web Development',
                'title': 'I will create a REST API with Django REST Framework',
                'desc': 'Complete REST API development with Django REST Framework including JWT authentication, serializers, viewsets and full documentation.',
                'skills': 'Python, Django, DRF, JWT, Swagger',
                'price': 280000, 'days': 5,
            },
            {
                'freelancer': 'jane_design', 'category': 'Graphic Design',
                'title': 'I will design a professional logo and brand identity',
                'desc': 'Custom logo design with full brand identity package including color palette, typography, business card and letterhead. Unlimited revisions until you are satisfied.',
                'skills': 'Adobe Illustrator, Photoshop, Branding, Logo Design',
                'price': 180000, 'days': 3,
            },
            {
                'freelancer': 'jane_design', 'category': 'Graphic Design',
                'title': 'I will design a modern UI/UX for your mobile app',
                'desc': 'Professional UI/UX design for iOS or Android apps. Includes wireframes, high-fidelity mockups, prototype and style guide.',
                'skills': 'Figma, UI/UX, Prototyping, Mobile Design',
                'price': 450000, 'days': 10,
            },
            {
                'freelancer': 'mike_mobile', 'category': 'Mobile Development',
                'title': 'I will build a cross-platform Flutter mobile app',
                'desc': 'Full Flutter app development for both iOS and Android from a single codebase. Includes Firebase integration, push notifications and App Store/Play Store submission.',
                'skills': 'Flutter, Dart, Firebase, REST API, iOS, Android',
                'price': 700000, 'days': 14,
            },
            {
                'freelancer': 'sarah_write', 'category': 'Writing & Content',
                'title': 'I will write SEO-optimised blog posts and articles',
                'desc': 'High-quality, research-backed blog posts and articles optimised for search engines. Includes keyword research, meta descriptions and internal linking strategy.',
                'skills': 'SEO Writing, Content Strategy, Research, Copywriting',
                'price': 100000, 'days': 2,
            },
        ]
        services = []
        for sd in services_data:
            freelancer_user = freelancers.get(sd['freelancer'])
            if not freelancer_user:
                continue
            svc, created = Service.objects.get_or_create(
                freelancer=freelancer_user,
                title=sd['title'],
                defaults={
                    'category': categories.get(sd['category']),
                    'description': sd['desc'],
                    'skills': sd['skills'],
                    'price': sd['price'],
                    'delivery_days': sd['days'],
                    'status': Service.STATUS_APPROVED,
                }
            )
            services.append(svc)
        self.stdout.write(f'  ✓ {len(services)} services (approved)')

        # ── Projects ─────────────────────────────────────────────────────
        if services:
            mary = clients['mary_client']
            alex = clients['alex_client']
            linda = clients['linda_client']
            john = freelancers['john_dev']
            jane = freelancers['jane_design']

            # Completed project (for review)
            proj1, _ = Project.objects.get_or_create(
                client=mary, freelancer=john,
                title='Company Website Redesign',
                defaults={
                    'service': services[0],
                    'description': 'Full redesign of our company website using Django.',
                    'budget': 350000, 'deadline': date.today() - timedelta(days=10),
                    'requirements': 'Responsive design, CMS integration, SEO friendly.',
                    'status': Project.STATUS_COMPLETED,
                    'completed_at': timezone.now() - timedelta(days=5),
                }
            )

            # Active project
            proj2, _ = Project.objects.get_or_create(
                client=alex, freelancer=jane,
                title='Brand Identity Package',
                defaults={
                    'service': services[2],
                    'description': 'Logo + full brand identity for our startup.',
                    'budget': 180000, 'deadline': date.today() + timedelta(days=5),
                    'requirements': 'Modern, minimalist style. Blue and white colors.',
                    'status': Project.STATUS_ACTIVE,
                }
            )

            # Pending request
            proj3, _ = Project.objects.get_or_create(
                client=linda, freelancer=john,
                title='E-commerce REST API',
                defaults={
                    'service': services[1] if len(services) > 1 else services[0],
                    'description': 'REST API for our e-commerce platform.',
                    'budget': 280000, 'deadline': date.today() + timedelta(days=14),
                    'requirements': 'Product listing, cart, orders, payments integration.',
                    'status': Project.STATUS_PENDING,
                }
            )
            self.stdout.write('  ✓ 3 sample projects')

            # ── Review ───────────────────────────────────────────────────
            if proj1.status == Project.STATUS_COMPLETED:
                review, created = Review.objects.get_or_create(
                    project=proj1,
                    defaults={
                        'client': mary, 'freelancer': john,
                        'rating': 5,
                        'comment': 'John delivered outstanding work. The website looks incredible and was completed ahead of schedule. Highly recommended!'
                    }
                )
                if created:
                    john.freelancer_profile.update_rating()
                    self.stdout.write('  ✓ 1 sample review')

            # ── Notifications ─────────────────────────────────────────────
            Notification.objects.get_or_create(
                user=john, title='New Project Request',
                defaults={
                    'message': 'Linda sent you a new project request: "E-commerce REST API".',
                    'notification_type': 'project',
                }
            )
            Notification.objects.get_or_create(
                user=mary, title='Welcome to FreelanceHub!',
                defaults={
                    'message': 'Your account is ready. Browse services and hire top freelancers.',
                    'notification_type': 'general',
                }
            )

        self.stdout.write(self.style.SUCCESS('\n✅ Sample data seeded successfully!\n'))
        self.stdout.write('Default accounts:')
        self.stdout.write('  Admin:      admin      / Admin@123')
        self.stdout.write('  Freelancer: john_dev   / Pass@1234')
        self.stdout.write('  Freelancer: jane_design / Pass@1234')
        self.stdout.write('  Freelancer: mike_mobile / Pass@1234')
        self.stdout.write('  Freelancer: sarah_write / Pass@1234')
        self.stdout.write('  Client:     mary_client / Pass@1234')
        self.stdout.write('  Client:     alex_client / Pass@1234')
        self.stdout.write('  Client:     linda_client / Pass@1234')
