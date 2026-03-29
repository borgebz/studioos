## Quick reference (fresh clone)

```bash
cd server
uv sync
cp .env.example .env                        # optional; edit for prod
uv run python manage.py migrate             # migrate/create database
uv run python manage.py seed_roles          #feed database with pre defined info
uv run python manage.py seed_permissions
uv run python manage.py seed_modalities
uv run python manage.py bootstrap_superuser --email admin@local.test --password 'your-dev-password' --role direction     # optional
uv run python manage.py runserver
```

## Tests

```bash
uv run pytest
```

## Adding a dependency

```bash
uv add <package-name>
```

## After changes and before commiting

After every change run the following commands, they format and lint code

```bash
uv run black .
uv run ruff check --fix .
```
