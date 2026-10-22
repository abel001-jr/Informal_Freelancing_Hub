# Hybrid Freelance Marketplace — Workflow and User Interaction Specification

**Project:** Web-Based Informal Freelance Service Marketplace  
**Approach:** Hybrid (Job-Based + Service-Based)  
**Focus:** User interactions, system behavior, decisions, transitions and workflow dependencies  
**Version:** 1.0

> **Basis and scope:** This specification maps the 14 functional modules in the supervisor's *What Must Be Captured in a Freelance Hub Digital Platform?* document into a proposed web-application workflow. The supervisor's document identifies information to capture and modules to cover; detailed state transitions and business rules below are **proposed implementation decisions**, not direct requirements from the document. No visual design or color palette is specified here.

## 1. Marketplace model and user roles

The platform supports two paths to a working agreement:

- **Job-based:** A client posts a job; freelancers find it and submit proposals; the client selects a freelancer.
- **Service-based:** A freelancer publishes a service; clients find it and submit requests; the freelancer accepts or negotiates a request.

Both paths converge into **one shared project lifecycle** for agreements, tasks, communication, deliverables, payments, completion and reviews.

| Actor | Main interactions |
|---|---|
| Visitor | Browse publicly available jobs, services and freelancer profiles |
| Client | Post jobs, request services, evaluate offers, hire, manage projects, pay and review |
| Freelancer | Maintain skills/profile, publish services, apply for jobs, negotiate, perform work and review |
| Administrator | Verify accounts where applicable, moderate listings, handle reports and disputes, monitor platform |

**Proposed role rule:** One account may have both client and freelancer capabilities. The active workspace determines available actions; authorization is checked on each operation. Administrative privileges are separately granted.

## 2. Registration, authentication and onboarding

1. Visitor chooses to register and enters required identity/contact and authentication details.
2. System validates fields, checks for duplicate accounts and enforces password requirements.
3. System verifies the configured email or phone channel using a code or link.
4. User chooses client, freelancer or both capabilities.
5. Client completes required contact/location information; freelancer additionally completes skills, categories, biography, availability and relevant experience.
6. System evaluates required profile fields and records onboarding status.
7. User accesses authorized workspace actions once eligible.

**Alternatives and exceptions:** Existing users log in; forgotten passwords use recovery; expired verification codes are rejected; incomplete onboarding can be resumed; suspended accounts cannot perform restricted actions.

## 3. Job-based workflow (client initiates)

### 3.1 Create and publish a job

1. Client starts a new job posting.
2. Client provides title, description, category, skills, location/work arrangement, budget, payment type, deadline and deliverables.
3. Client may save a draft.
4. On submission, system validates required information and ownership.
5. Valid posting is published or queued for moderation if approval is required.
6. System assigns an identifier and status; eligible freelancers can discover the published job.

**Proposed statuses:** `DRAFT → PENDING_REVIEW (optional) → PUBLISHED → HIRING → CLOSED`; separate rejection and cancellation paths.

### 3.2 Discover a job and submit a proposal

1. Freelancer searches published jobs by category, skills, location and budget.
2. Freelancer reviews the job details and eligibility conditions.
3. Freelancer submits a cover letter, bid, estimated delivery time and optional work samples.
4. System validates eligibility, open status and duplicate-application rules.
5. System records proposal and notifies the client.
6. Freelancer tracks proposal status.

### 3.3 Review, negotiate and hire

1. Client opens proposals belonging to their job.
2. Client compares bids, qualifications, portfolios and schedules.
3. Client may shortlist, reject, message or negotiate with applicants.
4. Client selects a preferred freelancer and proposes final terms.
5. Freelancer confirms or declines the agreed terms.
6. On mutual acceptance, system records an agreement and creates a linked project.
7. Other applicants receive appropriate outcome notifications.

**Rule:** Selection is not the same as project activation; activation depends on required agreement and payment conditions.

## 4. Service-based workflow (freelancer initiates)

### 4.1 Create and publish a service

1. Freelancer starts a service listing.
2. System checks required profile completion and permissions.
3. Freelancer enters title, category, description, pricing, location, availability and supporting examples.
4. Freelancer saves a draft or submits for publication.
5. System validates listing and publishes it or queues moderation.
6. Clients can search the published service; freelancer may edit, pause or archive it subject to rules.

**Proposed statuses:** `DRAFT → PENDING_REVIEW (optional) → PUBLISHED → PAUSED / ARCHIVED`.

### 4.2 Client requests a service

1. Client searches and compares published services, profiles, prices, ratings and availability.
2. Client opens a service and submits requirements, location, preferred schedule and optional attachments.
3. System creates a request in `PENDING_RESPONSE` state and notifies the freelancer.
4. Client tracks request status.

### 4.3 Freelancer responds and parties agree

- **Accept:** Freelancer accepts proposed terms; client confirms if required.
- **Counteroffer:** Freelancer proposes changes to scope, price or schedule; client accepts, rejects or counters.
- **Decline:** System closes the request without activating a project.

After both parties confirm the final terms, the system records the agreement and creates a project linked to the originating service request. Failed negotiations close without an active project.

## 5. Shared project lifecycle

| Stage | Client interaction | Freelancer interaction | System response |
|---|---|---|---|
| Agreement | Confirm scope, price and deadline | Confirm terms | Record agreement and origin |
| Creation | Provide final requirements | Accept assignment | Create linked project |
| Activation | Meet initiation/payment conditions | Confirm readiness | Set project active |
| Execution | Monitor progress | Perform work and update tasks | Record tasks and milestones |
| Communication | Send instructions | Send updates/questions | Store authorized messages and files |
| Submission | Inspect deliverables | Submit work | Mark submission pending review |
| Revision | Request corrections | Revise and resubmit | Preserve revision history |
| Approval | Approve work | Receive outcome | Record approval |
| Settlement | Complete payment obligation | Receive earnings | Record verified transaction status |
| Completion | Confirm closure as required | Confirm closure as required | Mark completed when conditions met |
| Feedback | Review freelancer | Review client | Record eligible reviews |

**Exception paths:** Cancellation, overdue milestones, non-response, failed payment, rejected deliverables and disputes require explicit status changes and audit records.

**Suggested project states:** `PENDING_AGREEMENT`, `PENDING_ACTIVATION`, `ACTIVE`, `SUBMITTED`, `REVISION_REQUESTED`, `APPROVED`, `COMPLETED`, `CANCELLED`, `DISPUTED`. Payment status should be tracked independently rather than conflated with project status.

## 6. Messaging and notifications

1. A relevant event occurs: proposal, service request, counteroffer, hiring decision, task update, submission, payment change or dispute outcome.
2. System stores the event and identifies authorized recipients.
3. System generates in-app notification and optionally email/SMS according to settings.
4. Recipient opens the linked job, proposal, request or project.
5. System checks authorization again before exposing private content.
6. Participants exchange messages and permitted attachments; system records sender, recipient, timestamps and read state.

**Rule:** A notification is not permission to access a resource.

## 7. Payments and financial records

1. Parties agree on price, currency, fees and payment schedule.
2. System records contractual payment obligations and any milestones.
3. Client initiates payment using a configured method.
4. A verified provider response or authorized reconciliation confirms transaction status.
5. System stores reference, amount, fees, status and receipt information.
6. Payment release/settlement follows the selected payment model.
7. Freelancer earnings and client transaction histories update.
8. Failed payments, refunds and disputes follow separate controlled workflows.

**Implementation decision required:** Choose between real payment-provider integration, manual payment-record tracking or a legally supported held-funds model. Do not represent an unverified user click as a successful payment.

## 8. Reviews, trust and disputes

### Reviews

1. Project reaches a review-eligible completed state.
2. System enables feedback for its actual participants.
3. Client and freelancer submit ratings and optional written reviews.
4. System validates eligibility and review limits.
5. Approved reviews attach to the completed project and relevant profiles.

### Disputes

1. Authorized participant files a complaint linked to a project or transaction.
2. System records issue, evidence and status; notifies the other party.
3. Other party may respond and submit evidence.
4. Administrator reviews the case and may request clarification.
5. Authorized decision is recorded and applicable changes are executed.
6. Both parties are notified; case closes with an audit trail.

## 9. Administrator workflow

| Trigger | Administrator action | System outcome |
|---|---|---|
| Verification request | Review evidence | Approve, reject or request changes |
| Reported listing | Inspect job/service and report | Retain, restrict or remove |
| Reported user | Investigate conduct | Warn, restrict or suspend |
| Dispute | Review records and statements | Record decision and resolution |
| Payment exception | Investigate transaction | Correct, escalate or refer within permissions |
| Support ticket | Respond and assign resolution | Update ticket and notify requester |
| Reporting request | Select report criteria | Generate authorized metrics/export |
| Security incident | Inspect logs and act | Record action and audit trail |

Administrator actions affecting accounts, payments, content or disputes must record actor, timestamp, reason and affected entity.

## 10. Workflow constraints and validation

- Only eligible freelancers can publish services or apply to jobs.
- Only a job owner can evaluate or accept proposals on that job.
- Closed jobs cannot accept new proposals.
- Duplicate active proposals for the same freelancer and job should be prevented unless explicitly supported.
- A service request requires mutual agreement before project activation.
- Every project records its source: accepted job proposal or accepted service request.
- Project completion requires required approvals and settlement conditions, as configured.
- Cancelled or declined requests cannot silently become active projects.
- Private conversations and files are accessible only to authorized parties.
- Reviews are linked to eligible real engagements.
- Administrative interventions are auditable.

## 11. Mapping to the supervisor's 14 modules

| # | Supervisor module | Workflow coverage |
|---|---|---|
| 1 | User Registration and Profile Management | Registration, verification, onboarding, account settings |
| 2 | Freelancer Skills and Portfolio | Profile setup, skills, service publication, samples |
| 3 | Job Posting and Management | Job creation, publication, editing, closure |
| 4 | Proposals and Recruitment | Application, shortlisting, negotiation, selection |
| 5 | Project and Task Management | Shared project lifecycle, milestones, revisions |
| 6 | Payments and Financial Records | Charges, receipts, earnings, refunds, disputes |
| 7 | Communication and Notifications | Messaging, event alerts, attachments |
| 8 | Ratings, Reviews and Trust | Verified reviews, complaints, identity status |
| 9 | Search and Matching | Search jobs, services and freelancers; filters |
| 10 | Administration | Moderation, account management, oversight |
| 11 | Security and Privacy | Authentication, permissions, audit logs, consent |
| 12 | Help and Support | Tickets, FAQs, complaint resolution |
| 13 | Reports and Analytics | Activity, projects, transactions, satisfaction metrics |
| 14 | Terms and Policies | Agreements, policies, cancellation and dispute rules |

## 12. Decisions to finalize before implementation

| Decision | Proposed default |
|---|---|
| One user may act as both client and freelancer | Yes |
| Freelancers can publish multiple services | Yes |
| Clients can publish multiple jobs | Yes |
| Freelancers can apply to different jobs | Yes |
| Negotiation/counteroffers allowed | Yes, with recorded revisions |
| Hiring instantly activates a project | No |
| Projects can use milestones | Yes, when applicable |
| Cancellation supported | Yes, under defined rules |
| Both parties can review each other | Yes, for eligible completed projects |
| Publication requires administrator pre-approval | To be decided |
| Payment provider and settlement model | To be decided |
| Automatic matching vs filtered search | To be decided |

## 13. Core principle

**Two independent ways to discover and agree on work; one standardized lifecycle for delivery, communication, payments, reviews and administrative oversight.**

This prevents duplicate project-management logic and keeps job-based and service-based transactions consistent across the platform.
