## Quick reference (fresh clone)

```bash
cd server
uv sync
cp .env.example .env                        # optional; edit for prod
uv run python manage.py migrate             # migrate/create database
uv run python manage.py seed_roles          #feed database with pre defined info
uv run python manage.py seed_permissions
uv run python manage.py seed_modalities
uv run python manage.py bootstrap_user --email dev@local.test --password 'your-dev-password' --role direction     # optional; normal user + role
uv run python manage.py runserver
```

## Tests

```bash
uv run pytest -s
```

## Adding a dependency

```bash
uv add <package-name>
```

## After changes and before committing

After every change run the following commands; they format and lint code:

```bash
uv run black .
uv run ruff check --fix .
```

### Before commit / push — guideline review

Repository root:

```bash
git log -5 --oneline
git diff origin/development...HEAD -- server/
```

Default base is **`origin/development`**. Use another ref when your work branches from elsewhere (e.g. `git diff origin/other-branch...HEAD`). Paste the command output and the diff, then add:

```
Review against .github/studioos-backend-rules-full.md (repository root). Violations only; by severity (blocker, should-fix, nit); cite files and lines where useful. No code rewrites.
Optional focus — commit(s): [align architecture with StudioOS guidelines]
```
