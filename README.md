<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/media/brand/logo-dancer-dark-mode.svg" />
  <img src="web/client/public/logo-dancer.svg" alt="" width="64" />
</picture>

# StudioOS

**The operating system for a dance school.**
Enrollments, private coachings, billing, events, costume inventory, a members' marketplace and messaging in one web platform.

![Django](https://img.shields.io/badge/Django-5.2-092E20?logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Academic project](https://img.shields.io/badge/IPCA-academic%20project-0F766E)

<img src="docs/media/gifs/tour.gif" alt="Tour of the StudioOS back-office" width="860" />

</div>

---

StudioOS was built by a team of five students at **IPCA — Instituto Politécnico do Cávado e do Ave** for a real client: **a dance school in Braga, Portugal** with around 400 students, 8 studios and a team of teachers, coordinators and staff. It replaces paper forms, spreadsheets and WhatsApp groups with one platform designed around how the school actually works.

## Contents

- [The problem](#the-problem)
- [Who it's for](#who-its-for)
- [Product tour](#product-tour)
- [How we built it](#how-we-built-it)
- [Architecture](#architecture)
- [Domain model](#domain-model)
- [Quality](#quality)
- [Run it locally](#run-it-locally)
- [Repository layout](#repository-layout)
- [Team](#team)
- [Development process and AI usage](#development-process-and-ai-usage)
- [Roadmap](#roadmap)
- [Data and content notice](#data-and-content-notice)

---

## The problem

Before StudioOS, the school ran on a patchwork of tools:

| Area | Before | Pain |
|---|---|---|
| **Private coachings** | Requests by message, scheduling in Excel | Double-booked studios, teachers chasing confirmations, billing calculated by hand |
| **Enrollments** | Paper and PDF forms, payment proofs by email | Lost documents, no GDPR consent trail, manual age checks per modality |
| **Costumes and props** | Hundreds of items with no catalogue | Duplicate purchases, no record of who borrowed what |
| **Communication** | Personal WhatsApp groups | Mixed private and school life, no history, hard to reach guardians |

The coaching workflow alone (request → check teacher and studio → approve → confirm attendance → split cost between participants → bill) was the most expensive manual process the school had. It became the core of the product.

## Who it's for

| Role | What they need | What StudioOS gives them |
|---|---|---|
| **Direction** | Full picture of the school, control over rules and people | Dashboard, roles and permissions, settings, billing overview |
| **Coordination** | Run day-to-day operations without chasing people | Coaching approval queue, enrollment review, studio calendar, user invites |
| **Teacher** | Manage their own time and students | Availability, coaching requests, attendance confirmation |
| **Student** | Book lessons, buy and borrow gear, stay informed | Coaching requests, marketplace, events, messages |
| **Guardian** | Act on behalf of a minor | Guardian delegation for enrollments, coachings and payments |
| **Staff** | Keep the costume catalogue in order | School inventory, variants and sizes, bookings and returns |

---

## Product tour

### Coaching: from request to calendar

Coordination reviews a pending request, picks a compatible studio (the API enforces which modalities each studio supports), sets the price and approves it. The session lands on the studio calendar and participants are notified by email.

<img src="docs/media/gifs/coaching.gif" alt="Coordination approving a coaching request" width="860" />

<details>
<summary>The coaching lifecycle behind this screen</summary>

```mermaid
stateDiagram-v2
    [*] --> requested: student or guardian asks
    [*] --> pending_approval: teacher creates own session
    [*] --> scheduled: coordination schedules directly
    requested --> pending_approval: teacher accepts
    pending_approval --> scheduled: coordination approves
    scheduled --> waiting_confirmation: session ends (Celery beat)
    waiting_confirmation --> pending_completion_approval: teacher and participants confirm attendance
    pending_completion_approval --> completed: coordination approves
    completed --> [*]: cost split into billing entries

    requested --> rejected
    pending_approval --> rejected
    requested --> cancelled
    pending_approval --> cancelled
    scheduled --> cancelled
    waiting_confirmation --> cancelled
    pending_completion_approval --> cancelled
```

A participant who cancels inside the late-cancellation window gets a fine, which coordination can approve or waive.

</details>

### Public enrollment form

New students apply without an account: personal data, guardian, modalities (validated against age limits), payment proof and GDPR consents recorded with timestamp, IP and user agent.

<img src="docs/media/gifs/enrollment.gif" alt="Public enrollment form" width="860" />

### Marketplace and school inventory

Members sell, rent, lend or donate dancewear. The school publishes its own costume catalogue with variants, sizes and bookings: a small circular economy inside the school.

<img src="docs/media/gifs/marketplace.gif" alt="Browsing the marketplace and opening a listing" width="860" />

### Real-time messaging

Direct and group conversations over WebSockets, with reactions and unread-message email digests.

<img src="docs/media/gifs/messages.gif" alt="Sending a message in a group conversation" width="860" />

### Mobile and dark mode

<table>
  <tr>
    <td width="30%" align="center"><img src="docs/media/gifs/mobile.gif" alt="StudioOS on a phone" width="260" /></td>
    <td width="70%">
      <img src="docs/media/screenshots/dark-home.png" alt="Dashboard in dark mode" />
      <img src="docs/media/screenshots/dark-calendar.png" alt="Studio calendar in dark mode" />
    </td>
  </tr>
</table>

<details>
<summary>More screenshots</summary>

| | |
|---|---|
| ![Landing page](docs/media/screenshots/light-root.png) | ![Login](docs/media/screenshots/light-login.png) |
| ![Dashboard](docs/media/screenshots/light-home.png) | ![Studio calendar](docs/media/screenshots/light-calendar.png) |
| ![Events](docs/media/screenshots/light-events.png) | ![Listing detail](docs/media/screenshots/light-marketplace_6.png) |
| ![Billing entries](docs/media/screenshots/light-billing_entries.png) | ![Users](docs/media/screenshots/light-users.png) |
| ![Marketplace, dark](docs/media/screenshots/dark-marketplace_browse.png) | ![Landing, dark](docs/media/screenshots/dark-root.png) |

Full-quality recordings are in [`docs/media/videos/`](docs/media/videos/), and a scroll through the public landing page is in [`docs/media/gifs/landing.gif`](docs/media/gifs/landing.gif).

</details>

---

## How we built it

### Process

We worked in **Scrum** with two-week sprints, planned and tracked in **Azure DevOps Boards** (epics → PBIs → tasks), with Azure Pipelines for CI/CD.

| | |
|---|---|
| **Analysis first** | Before any code, a Phase 1 report covered requirements, the RBAC model, BPMN business processes, use-case, ER, class and sequence diagrams, and mockups |
| **Backlog** | 10 epics, each broken into PBIs with acceptance criteria. Feature specs live in [`api/docs/feature/`](api/docs/feature/) |
| **Definition of Done** | Reviewed through a pull request by another member, acceptance criteria met, unit and integration tests passing in CI, docs updated, demonstrable on staging at the Sprint Review |
| **Ceremonies** | Sprint Planning, Sprint Review with a staging demo, Retrospective with documented improvement actions |

### Timeline

```mermaid
gantt
    title Sprints to Beta (2026)
    dateFormat YYYY-MM-DD
    axisFormat %d %b
    section Sprint 1
    EP-01 Requirements and modelling             :s1, 2026-03-02, 2026-03-13
    section Sprint 2
    EP-02 Infrastructure, EP-03 Auth and RBAC     :s2, 2026-03-16, 2026-03-27
    section Sprint 3
    EP-04 Studios and modalities, EP-05 Coachings :s3, 2026-03-30, 2026-04-10
    section Sprint 4
    EP-06 Enrollments, EP-07 Inventory           :s4, 2026-04-13, 2026-04-24
    section Sprint 5
    EP-07 Inventory, EP-08 Marketplace           :s5, 2026-04-27, 2026-05-08
    section Sprint 6
    EP-09 Dashboards, EP-10 Billing              :s6, 2026-05-11, 2026-05-22
    Beta release                                 :milestone, 2026-05-22, 0d
```

| Epic | Scope |
|---|---|
| EP-01 | Requirements analysis and system modelling |
| EP-02 | Technical infrastructure: repositories, pipelines, environments, database |
| EP-03 | Authentication, user management and the RBAC permission model |
| EP-04 | Master data: studios, modalities and their compatibility matrix |
| EP-05 | **Coachings**, the central epic: availability, requests, conflict checks, approval, double confirmation after the session, cost split, automatic billing |
| EP-06 | Enrollments: form, age validation per modality, payments, documents, GDPR consents |
| EP-07 | Inventory: digital costume catalogue with variants, sizes, colours and photos |
| EP-08 | Marketplace: listings, favourites, offers, transactions and returns |
| EP-09 | Role-based dashboards and the weekly studio occupancy calendar |
| EP-10 | Billing table and Excel export |

After the Beta, the team added events, messaging, guardian delegation and the public landing page.

### Design

The interface follows our own [UI guidelines](web/client/UI_GUIDELINES.md): an API-first, Saleor-inspired back-office with a two-column page layout, consistent page headers and sticky form footers, built on shadcn/ui and Tailwind CSS. Every component is documented in an in-app design-system showcase (`/design-system`). The public pages (landing, login, enrollment) use a more editorial look, so the school feels like a dance school and not an admin panel.

---

## Architecture

### System overview

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/media/diagrams/system-overview-dark.png" />
  <img src="docs/media/diagrams/system-overview.png" alt="StudioOS system overview: users reach the React web app, Caddy proxies to the Django API, which uses PostgreSQL, Redis and media storage; Celery beat and workers run background jobs and send emails through an external SMTP provider" />
</picture>

Modelled in [IcePanel](https://icepanel.io) at the C4 container level. Everything runs with Docker Compose on a single VPS: Caddy terminates HTTPS, serves the SPA and uploaded media, and proxies `/api` and `/ws` to the API. Celery beat schedules recurring jobs (reminders, state changes, digests) through Redis, and the workers execute them.

### API modules

One Django app per bounded context. Every app follows the same layers, enforced by an architecture test ([`test_architecture_layers.py`](api/server/tests/test_architecture_layers.py)).

```mermaid
flowchart TB
    classDef core fill:#64748B,stroke:#94A3B8,color:#F8FAFC
    classDef ctx fill:#334155,stroke:#94A3B8,color:#F8FAFC
    classDef main fill:#0F766E,stroke:#5EEAD4,color:#F8FAFC

    subgraph Contexts
        ACC[accounts<br/>users, roles, invites, guardians]:::ctx
        ROLES[roles<br/>permissions]:::ctx
        STU[studios + modality<br/>rooms, compatibility]:::ctx
        CLS[classes<br/>class groups]:::ctx
        AV[availability<br/>teacher slots]:::ctx
        COA[coachings<br/>private lessons]:::main
        BIL[billing<br/>entries, fines]:::ctx
        ENR[enrollments<br/>periods, forms, consents]:::ctx
        EVT[events<br/>shows, posts, interest]:::ctx
        INV[inventory<br/>products, variants, bookings]:::ctx
        MKT[marketplace<br/>listings, offers, transactions]:::ctx
        MSG[messaging<br/>conversations, WebSockets]:::ctx
    end
    CORE[core<br/>BaseModel, soft delete, audit, permissions, error contract]:::core

    COA --> AV & STU & CLS & BIL
    ENR --> STU & ACC
    MKT --> INV & MSG
    EVT --> CLS
    Contexts --> CORE
```

### Request flow

```mermaid
flowchart LR
    R["HTTP request"] --> V["View<br/>HTTP only, permissions"]
    V --> SER["Serializer<br/>validation, shape"]
    V --> SVC["Service<br/>business rules, transactions"]
    SVC --> M["Model<br/>soft delete + audit fields"]
    SVC -. "on commit" .-> T["Celery task<br/>email, notification"]
    V --> RESP["Response<br/>standard envelope and error codes"]
```

Key decisions:

- **API-first.** drf-spectacular publishes an OpenAPI schema and the web client's TypeScript API is generated from it (`npm run generate-client`), so types never drift.
- **Business rules live in services**, not in views or serializers. State machines (coachings, enrollments, transactions) use explicit allowed-transition maps.
- **Soft delete and audit fields** on every domain model, with partial unique constraints that ignore deleted rows.
- **httpOnly cookie auth** with 15-minute JWT access tokens and rotating, blacklisted refresh tokens.
- **Permission codes, not role checks.** Roles bundle permissions, and endpoints check permissions.

### Delivery pipeline

```mermaid
flowchart LR
    PR["Pull request"] --> CI
    subgraph CI["CI on every PR"]
        direction TB
        A1["API: black, ruff, Django check,<br/>migrations committed, pytest"]
        W1["Web: ESLint as PR comments,<br/>Prettier, tsc + Vite build"]
    end
    CI -->|review and merge to main| CD["CD: package, copy to VPS,<br/>docker compose build and up"]
    CD --> ST["Staging<br/>HTTPS via Caddy"]
```

---

## Domain model

About 50 models across 13 apps. The core relationships:

```mermaid
erDiagram
    USER ||--o{ USER_MODALITY : practises
    USER }o--|| ROLE : has
    USER ||--o| PROFILE : has
    MODALITY ||--o{ STUDIO_MODALITY : "allowed in"
    STUDIO ||--o{ STUDIO_MODALITY : supports
    CLASSE ||--o{ CLASSE_MEMBER : groups
    USER ||--o{ TEACHER_AVAILABILITY : offers
    COACHING_CLASS }o--|| MODALITY : teaches
    COACHING_CLASS }o--o| STUDIO : "held in"
    COACHING_CLASS }o--|| USER : "taught by"
    COACHING_CLASS ||--o{ COACHING_PARTICIPANT : has
    COACHING_PARTICIPANT ||--o{ BILLING_ENTRY : generates
    COACHING_PARTICIPANT ||--o| FINE : "may incur"
    ENROLLMENT_PERIOD ||--o{ ENROLLMENT : collects
    ENROLLMENT ||--o{ ENROLLMENT_MODALITY : chooses
    ENROLLMENT ||--o{ ENROLLMENT_CONSENT : records
    ENROLLMENT ||--o{ ENROLLMENT_FILE : attaches
    PRODUCT ||--o{ PRODUCT_VARIANT : has
    PRODUCT_VARIANT ||--o{ VARIANT_BOOKING : "booked as"
    PRODUCT ||--o{ LISTING : "offered in"
    LISTING ||--o{ LISTING_OFFER : receives
    LISTING ||--o{ PRODUCT_TRANSACTION : closes
    EVENT ||--o{ EVENT_POST : publishes
    EVENT ||--o{ EVENT_CLASS_TARGET : targets
    CONVERSATION ||--o{ MESSAGE : contains
    CONVERSATION ||--o{ CONVERSATION_PARTICIPANT : includes
```

Each bounded context is documented in [`api/docs/domain/`](api/docs/domain/).

---

## Quality

| | |
|---|---|
| **Backend tests** | pytest suite with 800+ tests: services, API contract, HTTP integration, state-machine invariants and architecture rules ([strategy](api/docs/testing.md)) |
| **Static checks** | black + ruff (API), TypeScript strict + Prettier + ESLint (web), all in CI |
| **End-to-end** | Scripted end-to-end runs and bug reports in [`api/docs/reports/`](api/docs/reports/) |
| **Security** | httpOnly cookies, refresh rotation and blacklist, HSTS, strict CORS, rate-limited public endpoints, sanitised rich text, GDPR consent trail |
| **Known gaps** | No automated frontend tests yet; open items are tracked in [`api/docs/todo/`](api/docs/todo/) |

---

## Run it locally

**Prerequisites:** Docker Desktop and Node.js 20+.

```bash
git clone https://github.com/borgebz/studioos.git
cd studioos/api
cp server/.env.example server/.env    # set SECRET_KEY and DB passwords; set DEBUG=True for local dev
docker compose up --build -d
docker compose exec api uv run python manage.py seed_demo_data
```

```bash
cd ../web/client
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173. Every demo account uses the password `123456`:

| Role | Email |
|---|---|
| Direction | `direction@studioos.dev` |
| Coordination | `coordination@studioos.dev` |
| Teacher | `teacher1@studioos.dev` |
| Student | `student1@studioos.dev` |
| Guardian | `parent1@studioos.dev` |
| Staff | `collaborator@studioos.dev` |

Local tools: Mailpit (captured emails) at http://localhost:8025 and the OpenAPI schema at http://localhost:8000/api/schema/. More options are in [`api/README.md`](api/README.md).

## Repository layout

```
studioos/
├── api/                 Django REST API, Celery workers, Docker Compose, Caddy
│   ├── server/          one Django app per bounded context, plus tests/
│   └── docs/            architecture, domain models, feature specs, test reports
├── web/
│   └── client/          React SPA, design system, generated API client
└── docs/media/          GIFs, videos and screenshots used in this README
```

The API and web client were developed in two repositories and merged here with their full commit history.

---

## Team

Group G08, Licenciatura em Engenharia de Sistemas Informáticos, Escola Superior de Tecnologia, IPCA. Curricular units: *Programação Web* and *Projeto de Desenvolvimento de Software*, 2025/2026.

| Name | Role |
|---|---|
| João Borges | Product Owner, developer |
| Daniel Batista | Scrum Master |
| Juliana Pereira | Developer |
| Ricardo Sousa | Developer |
| Tiago Bastos | Developer |

Supervised by Nuno Miguel and Eva Ferreira.

## Development process and AI usage

AI coding assistants (Claude Code, GitHub Copilot and Cursor) were part of our toolset. We used them to scaffold repetitive code and tests, implement UI from our own design guidelines, refactor, and run scripted end-to-end checks; the reports in [`api/docs/reports/`](api/docs/reports/) were produced this way. Requirements, domain modelling, architecture decisions and code review were done by the team, following the Definition of Done above.

## Roadmap

- Frontend test suite (component and end-to-end)
- Export to the school's existing management software
- Distributed tracing and observability
- Smoother coaching confirmation flow

---

## Data and content notice

All names, emails, phone numbers and records in this repository and its demo data are fictitious, created for testing and demonstration. The demo seed downloads royalty-free photos from Unsplash and generated avatars from DiceBear.

If you believe something here contains real personal data, or content that shouldn't be published, please **[open an issue](https://github.com/borgebz/studioos/issues/new)** with the file path or commit link. **Please don't paste the data itself in the issue.** We'll review and remove it promptly.
