from pathlib import Path
from datetime import timedelta
from decouple import config

# -----------------------------------------------------------------------------
# Base
# -----------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config(
    "SECRET_KEY",
    default="REMOVED",
)

DEBUG = config("DEBUG", default=True, cast=bool)

ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="localhost,127.0.0.1",
    cast=lambda x: [host.strip() for host in x.split(",")],
)


# -----------------------------------------------------------------------------
# Security
# -----------------------------------------------------------------------------

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG

# When Caddy (or any reverse proxy) terminates TLS in front of Django, the
# request arrives over plain HTTP from the proxy. Trust the X-Forwarded-Proto
# header so request.is_secure() returns True and cookie Secure flags are honoured.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Defence-in-depth: Caddy already redirects HTTP→HTTPS at the edge, so this only
# fires if a request bypasses Caddy and hits Django directly (e.g., container
# port accidentally exposed). With SECURE_PROXY_SSL_HEADER set above, normal
# Caddy traffic carries X-Forwarded-Proto=https and never triggers the redirect.
#
# CI sets this to False explicitly: tests use the Django test client which
# makes plain-HTTP requests and would receive 301s instead of the expected
# status codes. Defaults to `not DEBUG` so st/prod don't need to opt in.
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=not DEBUG, cast=bool)

# Use the X-Forwarded-Host header to build absolute URLs (so request.get_host()
# returns the public hostname like "st.studioos.club" rather than the internal
# container name "api").
USE_X_FORWARDED_HOST = True

# Built-in Django cookie hardening. Auth (JWT) cookies are configured separately
# in accounts/auth_cookies.py and already mirror this pattern.
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"


# -----------------------------------------------------------------------------
# CORS / CSRF
# -----------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000,http://localhost:5173",
    cast=lambda v: [o.strip() for o in v.split(",") if o.strip()],
)
CORS_ALLOW_CREDENTIALS = True

# Origins (scheme + host) allowed to send unsafe HTTP methods (POST/PUT/DELETE).
# Django rejects any cross-origin POST if the Origin header isn't in this list.
# Staging: "https://st.studioos.club,https://api.st.studioos.club"
CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    default="",
    cast=lambda v: [o.strip() for o in v.split(",") if o.strip()],
)


# -----------------------------------------------------------------------------
# Application definition
# -----------------------------------------------------------------------------

INSTALLED_APPS = [
    "daphne",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    "django_celery_beat",
    "channels",
    # Local
    "accounts",
    "core",
    "modality",
    "studios",
    "enrollments",
    "coachings",
    "availability",
    "inventory",
    "events",
    "billing",
    "classes",
    "roles",
    "messaging",
    "marketplace",
]

# API-only: no django.contrib.sessions / SessionMiddleware / AuthenticationMiddleware.
# JWT auth is handled by DRF; Django's auth middleware requires sessions.
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
AUTH_USER_MODEL = "accounts.User"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
            ],
        },
    },
]


# -----------------------------------------------------------------------------
# Database
# -----------------------------------------------------------------------------

DATABASES = {
    "default": {
        "ENGINE": config("DB_ENGINE", default="django.db.backends.sqlite3"),
        "NAME": config("DB_NAME", default=str(BASE_DIR / "db.sqlite3")),
        "USER": config("DB_USER", default=""),
        "PASSWORD": config("DB_PASSWORD", default=""),
        "HOST": config("DB_HOST", default=""),
        "PORT": config("DB_PORT", default=""),
    }
}


# -----------------------------------------------------------------------------
# Authentication
# -----------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# -----------------------------------------------------------------------------
# REST Framework
# -----------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "accounts.authentication.CookieJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLE_RATES": {
        "anon": "5/min",
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "StudioOS API",
    "DESCRIPTION": "School dance management platform",
    "VERSION": "1.0.0",
    "POSTPROCESSING_HOOKS": [
        "drf_spectacular.hooks.postprocess_schema_enums",
    ],
    # Several models declare an inner `Status` TextChoices class. Without
    # explicit names drf-spectacular falls back to hash-suffixed names like
    # `StatusDc4Enum`, `Status421Enum`, … which surface in the generated
    # TypeScript client and force the frontend to import obscure enums.
    # Map each value set to a human-readable name so the generated client
    # exports `ProductStatusEnum`, `ListingStatusEnum`, etc.
    # Inner Choices classes (e.g. Product.Status) can't be referenced by dotted
    # path because Python's import_string only walks modules. Pass the literal
    # value list for those; use the dotted path for top-level Choices classes.
    "ENUM_NAME_OVERRIDES": {
        "ProductStatusEnum": [
            ("active", "Active"),
            ("inactive", "Inactive"),
            ("archived", "Archived"),
        ],
        "TargetGenderEnum": [
            ("female", "Female"),
            ("male", "Male"),
            ("unisex", "Unisex"),
        ],
        "ProductVariantStatusEnum": [
            ("available", "Available"),
            ("maintenance", "Maintenance"),
            ("inactive", "Inactive"),
            ("sold", "Sold"),
            ("donated", "Donated"),
            ("archived", "Archived"),
        ],
        "VariantBookingStatusEnum": [
            ("pending", "Pending"),
            ("confirmed", "Confirmed"),
            ("completed", "Completed"),
            ("blocked", "Blocked"),
            ("cancelled", "Cancelled"),
        ],
        "ListingStatusEnum": [
            ("draft", "Draft"),
            ("active", "Active"),
            ("closed", "Closed"),
        ],
        "TransactionStatusEnum": [
            ("pending", "Pending"),
            ("accepted", "Accepted"),
            ("completed", "Completed"),
            ("rejected", "Rejected"),
            ("cancelled", "Cancelled"),
            ("blocked", "Blocked"),
        ],
        "BillingEntryStatusEnum": "billing.models.BillingEntryStatus.choices",
        "FineStatusEnum": "billing.models.FineStatus.choices",
        "CoachingParticipantStatusEnum": "coachings.models.CoachingParticipantStatus.choices",
    },
}

# -----------------------------------------------------------------------------
# JWT
# -----------------------------------------------------------------------------

_JWT_ACCESS_MINUTES = config("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=15, cast=int)
_JWT_REFRESH_DAYS = config("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7, cast=int)

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=_JWT_ACCESS_MINUTES),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=_JWT_REFRESH_DAYS),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
}


# -----------------------------------------------------------------------------
# Email
# -----------------------------------------------------------------------------

EMAIL_BACKEND = config(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = config("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="noreply@studioos.dev")

FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:5173")
BACKEND_URL = config("BACKEND_URL", default="http://localhost:8000")


# -----------------------------------------------------------------------------
# Coachings / billing
# -----------------------------------------------------------------------------
# Cancellations within this many hours before start_datetime are "late"
# (LATE_CANCELLED → fine candidate at completion time).
COACHING_LATE_CANCELLATION_HOURS = config(
    "COACHING_LATE_CANCELLATION_HOURS", default=48, cast=int
)

# Suggested fine amount (EUR) shown to coordination at fine approval time.
# Coordination can override before approving. Will move to an in-app settings
# table in the future for direction-controlled configuration.
COACHING_FINE_DEFAULT_AMOUNT = config("COACHING_FINE_DEFAULT_AMOUNT", default="25.00")

# Reminder windows (hours after coaching end_datetime) for the
# WAITING_CONFIRMATION → attendance/teacher confirmation reminders.
# Comma-separated "hours:final" pairs, e.g. "24:0,42:1" means:
#   24h = first reminder (not final), 42h = final reminder.
COACHING_REMINDER_WINDOWS_RAW = config("COACHING_REMINDER_WINDOWS", default="24:0,42:1")
COACHING_REMINDER_WINDOWS = []
for _pair in COACHING_REMINDER_WINDOWS_RAW.split(","):
    _h, _f = _pair.strip().split(":")
    COACHING_REMINDER_WINDOWS.append((int(_h), bool(int(_f))))


# Window (in minutes) during which a message sender can edit their own message
# after it was sent. After this window, edits are rejected.
MESSAGE_EDIT_WINDOW_MINUTES = config(
    "MESSAGE_EDIT_WINDOW_MINUTES", default=15, cast=int
)


# -----------------------------------------------------------------------------
# Internationalisation
# -----------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# -----------------------------------------------------------------------------
# Static and media files
# -----------------------------------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"


# -----------------------------------------------------------------------------
# Celery
# -----------------------------------------------------------------------------

CELERY_BROKER_URL = config("CELERY_BROKER_URL", default="redis://redis:6379/0")
CELERY_RESULT_BACKEND = config("CELERY_RESULT_BACKEND", default="redis://redis:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_SEND_EVENTS = True
CELERY_SEND_TASK_SENT_EVENT = True
CELERY_EVENT_QUEUE_EXPIRES = 60
CELERY_EVENT_QUEUE_TTL = 5

# Invite onboarding tokens (Redis). Uses DB 1 by default to separate keys from Celery (DB 0).
INVITE_REDIS_URL = config("INVITE_REDIS_URL", default="redis://redis:6379/1")

# Django Channels — uses DB 2 to keep keys separate from Celery (DB 0) and invite tokens (DB 1).
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [
                config("CHANNEL_LAYERS_REDIS_URL", default="redis://redis:6379/2")
            ],
        },
    },
}


# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------

LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": LOGS_DIR / "studioos.log",
            "maxBytes": 1024 * 1024 * 100,  # 100 MB
            "backupCount": 5,
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"] if DEBUG else ["file"],
        "level": "DEBUG" if DEBUG else "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"] if DEBUG else ["file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
