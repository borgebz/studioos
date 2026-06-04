# StudioOS — API

Django REST API for **StudioOS**, a management platform for dance schools. This folder holds the backend, background workers and deployment configuration.

The product overview, screenshots, team and academic context are in the [root README](../README.md).

## Overview

- **Django 5.2 + Django REST Framework**, served over ASGI (Daphne) with Channels for real-time messaging
- **PostgreSQL**, **Redis**, **Celery + Celery Beat** for emails, reminders and scheduled jobs
- **OpenAPI schema** via drf-spectacular; the web client's TypeScript API client is generated from it
- **Layered architecture**: views → services → models, enforced by `server/tests/test_architecture_layers.py`

## Repository layout

```
.
├── server/                Django project (one app per bounded context)
│   ├── accounts/          users, roles, auth, invitations, guardians
│   ├── studios/ modality/ classes/
│   ├── enrollments/       enrollment periods and public enrollment form
│   ├── coachings/         private lessons and their state machine
│   ├── availability/      teacher availability
│   ├── billing/           billing entries and fines
│   ├── events/            events and ticket reservations
│   ├── inventory/         products, variants, bookings
│   ├── marketplace/       member listings, offers
│   ├── messaging/         conversations (WebSockets)
│   ├── core/              base models, permissions, error contract
│   └── tests/             pytest suite
├── docs/                  architecture, domain models, feature specs, test reports
├── bruno/                 API request collection (Bruno)
├── ci-cd/                 Azure DevOps pipeline
├── docker-compose*.yml    local and staging stacks
└── Caddyfile              reverse proxy for staging
```

## Getting started

```bash
cp server/.env.example server/.env   # set SECRET_KEY, DB passwords, and DEBUG=True for local dev
docker compose up --build
docker compose exec api uv run python manage.py seed_demo_data
```

- API: http://localhost:8000 — OpenAPI schema at `/api/schema/`
- Mailpit: http://localhost:8025

More options (running without Docker, seeding flags, monitoring tools) in [server/README.md](server/README.md).

## Tests

```bash
docker compose exec api uv run pytest
```

Test strategy and conventions: [docs/testing.md](docs/testing.md).

## Documentation

Start at [docs/README.md](docs/README.md). Highlights:

- [Architecture](docs/architecture.md)
- [API conventions](docs/api-conventions.md)
- [Domain models](docs/domain/)
- [Feature specifications](docs/feature/)
