# StudioOS — Documentation

Design, domain and process documentation for the StudioOS API.
Start with `architecture.md`, then the `domain/` file for the area you are working on.

---

## Structure

```
docs/
├── README.md                  ← you are here
├── architecture.md            ← layered architecture, golden rules, code patterns
├── infrastructure.md          ← Docker, Celery, Redis, Beat, Mailpit
├── api-conventions.md         ← response contract, error codes, schema annotation rules
├── testing.md                 ← test strategy, fixtures, academic requirements
├── backlog-status.md          ← what is built, in progress and pending
├── open-questions.md          ← unresolved design decisions
├── email-design-system.md     ← transactional email templates
├── email-simulation.md        ← simulating email flows locally
├── domain/                    ← one file per bounded context (models, rules, state machines)
├── feature/                   ← feature specs / PBIs as planned in Azure DevOps sprints
├── inventory/                 ← inventory data model
├── testing/                   ← manual test plans per feature
├── reports/                   ← end-to-end test run and bug report
└── todo/                      ← known gaps and follow-up items
```

---

## Quick orientation

| What | Where |
|------|-------|
| Backend source | `server/` |
| Run management commands | `docker compose exec api uv run python manage.py <cmd>` |
| OpenAPI schema (local) | `http://localhost:8000/api/schema/` |
| Mailpit (local) | `http://localhost:8025` |
| Project management | Azure DevOps (boards, sprints, pipelines) |

---

## Project identity

| Key | Value |
|-----|-------|
| Name | StudioOS |
| Domain | Dance school management |
| Context | Academic project (IPCA) built for a real dance school |

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 5.2, Django REST Framework |
| Auth | SimpleJWT — access + refresh tokens, rotation, blacklist |
| API schema | drf-spectacular |
| Frontend client | swagger-typescript-api (generated from `/api/schema/`) |
| Database | PostgreSQL (dev + prod) |
| Package manager | `uv` |
| Background tasks | Celery + Celery Beat |
| Message broker | Redis |
| Dev email | Mailpit |
| Frontend | React + Vite + TypeScript |
| Containerisation | Docker + docker-compose |
| CI | Azure DevOps Pipelines (Black + Ruff enforced) |
| Storage (prod) | Cloudflare R2 (S3-compatible; local filesystem in dev) |
