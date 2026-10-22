# Django backend

Use Python 3.12 or newer. Dependencies are bounded to the Django 6.0 and DRF 3.16 release series; install the latest matching patches with the command below. These ranges are not an exact dependency lock.

## Local setup (PowerShell)

Run from the repository root. Calling the virtual environment's Python directly avoids PowerShell activation policy issues.

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
Set-Location backend
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py createsuperuser
..\.venv\Scripts\python.exe manage.py runserver
```

Copy the example only on first setup, preserving an existing `.env`. Django loads `backend/.env` for management commands, WSGI, and ASGI. Process environment variables take precedence. The `.env`, SQLite database, and uploaded files are ignored by Git.

SQLite is stored at `backend/db.sqlite3`. The custom user model is `accounts.User`; run migrations before creating users. Optional demo data: `manage.py seed_data` using the same virtual environment Python.

## API setup

- Backend information: http://127.0.0.1:8000/
- Database health: http://127.0.0.1:8000/api/health/
- Browsable REST API: http://127.0.0.1:8000/api/
- Django administration: http://127.0.0.1:8000/django-admin/
- Public marketplace: `/api/services/`, `/api/categories/`
- Registration: `POST /api/auth/register/`
- JWT login: `POST /api/auth/token/` with JSON `username` and `password`
- JWT refresh: `POST /api/auth/token/refresh/` with JSON `refresh`
- Current account: `GET /api/auth/me/`

Pass the login response's access token as `Authorization: Bearer <access>` for protected requests. Access tokens last 60 minutes; refresh tokens last one day. Session authentication also supports the browsable API at `/api/auth/login/`; session-authenticated writes require CSRF protection. Global permissions require authentication, with individual views allowing public access where appropriate. Pagination returns 10 items per page; default throttles allow 60 anonymous requests/hour and 1,000 authenticated requests/hour. Throttles currently use Django's local-memory cache, so counters are per process.

Example login from PowerShell, with credentials for a user you created:

```powershell
$credentials = @{ username = 'your-username'; password = 'your-password' } | ConvertTo-Json
$tokens = Invoke-RestMethod http://127.0.0.1:8000/api/auth/token/ -Method Post -ContentType 'application/json' -Body $credentials
Invoke-RestMethod http://127.0.0.1:8000/api/auth/me/ -Headers @{ Authorization = "Bearer $($tokens.access)" }
```

Registration and password reset send links through the console email backend in development. Follow the link printed in the Django terminal to verify an email. `FRONTEND_URL` controls the destination of these links; marketplace verification and moderation rules are configured in `.env.example`.

The React development server proxies `/api/` and `/media/` to Django. Direct browser requests from another origin need a deliberate CORS configuration; `CSRF_TRUSTED_ORIGINS` does not enable CORS. Private project and message attachments use authenticated API downloads.

## Validation

From `backend/`:

```powershell
..\.venv\Scripts\python.exe manage.py check
..\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
..\.venv\Scripts\python.exe manage.py test --noinput
```

After editing models, create migrations with `manage.py makemigrations` and apply them with `manage.py migrate`. Tests create a separate test database.

## Deployment configuration

Set `DJANGO_DEBUG=false`, a unique `DJANGO_SECRET_KEY`, and `DJANGO_ALLOWED_HOSTS` for the deployment. HTTPS redirects and secure session/CSRF cookies default to enabled with debug disabled. Configure HTTPS at the server; TLS-terminating proxies require explicit trusted proxy configuration before Django can correctly detect secure requests. `DJANGO_SECURE_SSL_REDIRECT`, `DJANGO_SESSION_COOKIE_SECURE`, and `DJANGO_CSRF_COOKIE_SECURE` can override those defaults. Set `DJANGO_CSRF_TRUSTED_ORIGINS` to comma-separated full origins when required by the hosting arrangement.

Use `config.wsgi:application` or `config.asgi:application` with an appropriate production server. Run `manage.py collectstatic --noinput` and arrange serving for `backend/staticfiles/` and public media only. Configure a real email backend and SMTP settings for account emails. Review database, shared cache, backups, and media storage for the deployment; the current setup is intended for local SQLite development. Run `manage.py check --deploy` with the actual deployment environment. `runserver` is for development.

Configuration references: [Django deployment checklist](https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/) and [DRF settings](https://www.django-rest-framework.org/api-guide/settings/).
