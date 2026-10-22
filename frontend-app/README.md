# React frontend

See [the repository README](../README.md) for setup and API proxy configuration.


The `/` route uses the approved landing-page design from `documents/templates/landing-page.html`, implemented as `src/pages/HomePage.jsx` with scoped `LandingPage.css`. It has its own header/footer; other marketplace routes use the shared layout. Service cards link to searches, and account actions link to registration, login, or the current workspace. The page includes responsive navigation, keyboard-accessible service collection filters, FAQs, and a full-viewport hero without a dashboard preview. Project illustrations remain example content.


System admin workspace: `/dashboard/admin`, restricted to administrators. Includes live summary counts, paginated record tables, current-page search, record details, and service approval/rejection with a required decision reason. Other record collections are read-only in this UI. Authentication loads identity and admin capability from `/api/auth/me/`, including Django superusers. API permissions remain authoritative. Django administration is available separately at `/django-admin/` with a Django session login.


Freelancer workspace: `/dashboard/freelancer`. Includes live own-service and project counts, proposals, job browsing, notifications, paginated records, and record details. The Add Service form saves a draft; publishing is separate and respects backend eligibility and moderation. Profile completeness, terms acceptance, and email verification requirements still apply. Overview statistics do not imply earnings or payment collection. My Services, My Projects, and My Proposals are filtered server-side to the signed-in freelancer. Job proposals and project delivery actions are not submitted from this dashboard yet.


Dashboard design components live in `src/components/dashboard/`: `DashboardShell.jsx` supplies the shared header and responsive drawer behavior; `DashboardSidebar.jsx` supplies role-specific navigation, marketplace links, account controls, and workspace switching; `Dashboard.module.css` contains shared dashboard styles. Admin, client, and freelancer workspaces all use these components. The client dashboard includes live own-project, own-job, request, and notification views.


Dual-role accounts use `/dashboard/workspace`, one composite dashboard with grouped Hiring, Freelancing, Shared, and Marketplace navigation. Hiring contains client projects, posted jobs, and sent requests. Freelancing contains delivery projects, service management, proposals, incoming service requests, and job discovery. The overview shows separate hiring/freelancing summaries and labels the role context of records. Notifications and marketplace browsing stay in the same shell. Older client/freelancer dashboard URLs redirect dual-role users into the composite workspace while preserving relevant sections and marketplace views. Single-role accounts and administrators retain their existing dashboards.


Profile setup is available at `/profile` or Profile & settings in every dashboard. It opens inside the current role's workspace. Personal details include names, email, phone, profile photo, location, preferred language, and biography. Language is stored as a preference, not an interface translation. The security tab supports email-token verification/resending and current-password-authenticated password changes. The information tab displays role, account status, registration date, and terms acceptance as system-managed fields. Email changes reset verification and send a new token; password changes require signing in again. Photos accept JPEG, PNG, or WebP up to 5 MB and are public profile images. Account emails use the configured Django backend (console output in local development).


Settings now uses an uploadable cover banner, overlapping avatar, and horizontal My details, Professional profile, Password, Email verification, and Account tabs. Cover uploads save immediately; profile photo changes save with personal details. Both accept JPEG, PNG, and WebP up to 5 MB. Professional settings save freelancer title, skills, hourly rate, availability, experience, education, portfolio, and website, plus company details for client profiles. The dashboard top bar stays pinned while scrolling.
