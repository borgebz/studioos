"""
Seed demo data covering every page on the web client.

Idempotent: re-running creates missing records and skips ones already present.
Local-dev only — bypasses some state machines (e.g. coaching completion) so the
seeded snapshot has rows in every status the UI lists.

Usage (from a host machine that has docker compose up):

    docker compose run --rm api uv run python manage.py seed_demo_data

Or from the script wrapper at scripts/seed_demo_data.sh.

All users share the same email host (default ``@studioos.dev``) and password
``123456``.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from decimal import Decimal

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import Profile, Role, User
from availability.models import TeacherAvailability
from billing.models import (
    BillingEntry,
    BillingEntrySourceType,
    BillingEntryStatus,
    Fine,
    FineReason,
    FineStatus,
)
from classes.models import Classe, ClasseMember
from coachings.models import (
    CoachingClass,
    CoachingParticipant,
    CoachingParticipantStatus,
    CoachingStatus,
)
from enrollments.models import (
    ConsentType,
    Enrollment,
    EnrollmentConsent,
    EnrollmentModality,
    EnrollmentPayment,
    EnrollmentPeriod,
    EnrollmentStatus,
    EnrollmentType,
    PaymentStatus,
    PaymentType,
    PeriodType,
)
from events.models import (
    Event,
    EventClassTarget,
    EventComment,
    EventInterest,
    EventPost,
    EventState,
    EventVisibilityState,
)
from inventory.models import (
    Category,
    Color,
    Product,
    ProductVariant,
    SchoolProductDetails,
    Size,
    SizeSystem,
    VariantBooking,
    VariantColor,
)
from marketplace.models import (
    Listing,
    ListingComment,
    ListingFavorite,
    ProductTransaction,
)
from modality.models import Modality, UserModality
from studios.models import Studio, StudioModality

logger = logging.getLogger(__name__)

DEFAULT_PASSWORD = "123456"
DEFAULT_HOST = "studioos.dev"


# Email handle → (first_name, last_name, role_code, extra fields)
USER_SPECS = [
    ("direction",      "Diana",  "Director",   "direction"),
    ("coordination",   "Carla",  "Coord",      "coordination"),
    ("collaborator",   "Caio",   "Helper",     "collaborator"),
    ("teacher1",       "Tomas",  "Almeida",    "teacher"),
    ("teacher2",       "Teresa", "Santos",     "teacher"),
    ("teacherext",     "Tiago",  "Ribeiro",    "teacher_external"),
    ("parent1",        "Patricia", "Pereira",  "parent"),
    ("parent2",        "Paulo",  "Costa",      "parent"),
    ("student1",       "Sofia",  "Lima",       "student"),
    ("student2",       "Sara",   "Martins",    "student"),
    ("student3",       "Simao",  "Ferreira",   "student"),
    ("student4",       "Sabrina","Gomes",      "student"),
]


class Command(BaseCommand):
    help = "Populate the database with demo data covering every web page."

    def add_arguments(self, parser):
        parser.add_argument(
            "--host",
            default=DEFAULT_HOST,
            help=f"Email host (default: {DEFAULT_HOST}).",
        )
        parser.add_argument(
            "--password",
            default=DEFAULT_PASSWORD,
            help=f"Password used for every user (default: {DEFAULT_PASSWORD}).",
        )

    def handle(self, *args, **opts):
        host = opts["host"]
        password = opts["password"]

        self.stdout.write(self.style.MIGRATE_HEADING("→ Applying migrations"))
        call_command("migrate", verbosity=0, interactive=False)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Pre-seeding catalog data"))
        # These commands are already idempotent and live in the codebase.
        for cmd in (
            "seed_roles",
            "seed_permissions",
            "seed_modalities",
            "seed_size_systems",
            "seed_sizes",
            "seed_colors",
            "seed_categories",
        ):
            self.stdout.write(f"  · {cmd}")
            call_command(cmd, verbosity=0)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Creating users"))
        users = self._seed_users(host=host, password=password)

        actor = users["direction"]

        self.stdout.write(self.style.MIGRATE_HEADING("→ Studios"))
        studios = self._seed_studios(actor=actor)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Studio ↔ Modality"))
        self._seed_studio_modalities(studios=studios, actor=actor)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Teacher ↔ Modality"))
        self._seed_user_modalities(users=users, actor=actor)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Parent ↔ Student"))
        self._seed_parent_links(users=users)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Classes"))
        classes = self._seed_classes(users=users, actor=actor)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Enrollment period + enrollments"))
        period = self._seed_enrollment_period(actor=actor)
        self._seed_enrollments(period=period, users=users, actor=actor)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Teacher availability"))
        self._seed_teacher_availability(users=users, actor=actor)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Coachings"))
        coachings = self._seed_coachings(
            users=users, studios=studios, classes=classes, actor=actor
        )

        self.stdout.write(self.style.MIGRATE_HEADING("→ Billing + Fines"))
        self._seed_billing_and_fines(coachings=coachings, users=users, actor=actor)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Events"))
        self._seed_events(users=users, classes=classes, actor=actor)

        self.stdout.write(self.style.MIGRATE_HEADING("→ School inventory + variants"))
        school_variants = self._seed_school_inventory(actor=actor)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Member inventory (for marketplace)"))
        member_variants = self._seed_member_inventory(users=users)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Marketplace listings"))
        self._seed_marketplace(
            school_variants=school_variants,
            member_variants=member_variants,
            users=users,
            actor=actor,
        )

        self.stdout.write(self.style.MIGRATE_HEADING("→ Variant bookings"))
        self._seed_bookings(school_variants=school_variants, users=users, actor=actor)

        self.stdout.write(self.style.SUCCESS("\n✓ Demo data seeded."))
        self.stdout.write(
            f"\n  Login at the web client with any of:\n"
            + "\n".join(f"    {h}@{host}  /  {password}" for h, *_ in USER_SPECS)
        )

    # ──────────────────────────────────────────────────────────────────────
    #  Users
    # ──────────────────────────────────────────────────────────────────────
    @transaction.atomic
    def _seed_users(self, *, host: str, password: str) -> dict[str, User]:
        users: dict[str, User] = {}
        for handle, first_name, last_name, role_code in USER_SPECS:
            email = f"{handle}@{host}"

            try:
                role = Role.objects.select_related("group").get(code=role_code)
            except Role.DoesNotExist:
                raise RuntimeError(
                    f"Role {role_code!r} missing — run seed_roles first."
                )

            user = User.objects.filter(email=email).first()
            if user is None:
                user = User.objects.create_user(
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    is_active=True,
                )
                self.stdout.write(f"  + {email}")
            else:
                user.first_name = first_name
                user.last_name = last_name
                user.is_active = True
                user.set_password(password)
                user.save(update_fields=["first_name", "last_name", "is_active", "password"])
                self.stdout.write(f"  · {email} (updated)")

            user.groups.clear()
            user.groups.add(role.group)
            users[handle] = user

            Profile.objects.get_or_create(
                user=user,
                defaults={
                    "display_name": f"{first_name} {last_name}",
                    "bio": f"{role_code.title()} demo account.",
                    "is_public": role_code in {"teacher", "teacher_external"},
                },
            )

        return users

    # ──────────────────────────────────────────────────────────────────────
    #  Studios
    # ──────────────────────────────────────────────────────────────────────
    @transaction.atomic
    def _seed_studios(self, *, actor: User) -> list[Studio]:
        defs = [
            ("Sala A — Espelhos", 25, "Sala principal com chão de linóleo."),
            ("Sala B — Barre",    18, "Sala dedicada a clássico e barre."),
            ("Sala C — Acro",     12, "Sala com tapetes para acrobática."),
        ]
        studios = []
        for name, cap, desc in defs:
            obj, created = Studio.objects.get_or_create(
                name=name,
                defaults={
                    "max_capacity": cap,
                    "description": desc,
                    "created_by": actor,
                },
            )
            studios.append(obj)
            self.stdout.write(f"  {'+' if created else '·'} {obj.name}")
        return studios

    @transaction.atomic
    def _seed_studio_modalities(self, *, studios: list[Studio], actor: User) -> None:
        modalities = list(Modality.objects.all().order_by("pk"))
        if not modalities:
            return
        # Spread modalities across studios round-robin.
        for idx, modality in enumerate(modalities):
            studio = studios[idx % len(studios)]
            StudioModality.objects.get_or_create(
                studio=studio,
                modality=modality,
                defaults={"created_by": actor},
            )

    # ──────────────────────────────────────────────────────────────────────
    #  Teacher ↔ Modality
    # ──────────────────────────────────────────────────────────────────────
    @transaction.atomic
    def _seed_user_modalities(self, *, users: dict[str, User], actor: User) -> None:
        teachers = [users["teacher1"], users["teacher2"], users["teacherext"]]
        modalities = list(Modality.objects.all().order_by("pk")[:6])
        for idx, modality in enumerate(modalities):
            teacher = teachers[idx % len(teachers)]
            UserModality.objects.get_or_create(
                user=teacher,
                modality=modality,
                defaults={"created_by": actor},
            )

    # ──────────────────────────────────────────────────────────────────────
    #  Parent ↔ Student
    # ──────────────────────────────────────────────────────────────────────
    @transaction.atomic
    def _seed_parent_links(self, *, users: dict[str, User]) -> None:
        pairs = [
            (users["parent1"], users["student1"]),
            (users["parent1"], users["student2"]),
            (users["parent2"], users["student3"]),
        ]
        for parent, student in pairs:
            if student.parent_id != parent.pk:
                student.parent = parent
                student.save(update_fields=["parent"])

    # ──────────────────────────────────────────────────────────────────────
    #  Classes
    # ──────────────────────────────────────────────────────────────────────
    @transaction.atomic
    def _seed_classes(self, *, users: dict[str, User], actor: User) -> list[Classe]:
        defs = [
            ("Turma A — Ballet Infantil", "Crianças entre os 5 e 7 anos."),
            ("Turma B — Contemporâneo Juvenil", "Dança contemporânea, 12-15 anos."),
        ]
        students = [users["student1"], users["student2"], users["student3"], users["student4"]]
        classes = []
        for name, desc in defs:
            classe, _ = Classe.objects.get_or_create(
                name=name,
                defaults={"description": desc, "created_by": actor},
            )
            classes.append(classe)
            for student in students:
                ClasseMember.objects.get_or_create(
                    classe=classe,
                    student=student,
                    defaults={"created_by": actor},
                )
        return classes

    # ──────────────────────────────────────────────────────────────────────
    #  Enrollments
    # ──────────────────────────────────────────────────────────────────────
    @transaction.atomic
    def _seed_enrollment_period(self, *, actor: User) -> EnrollmentPeriod:
        today = timezone.localdate()
        year = today.year if today.month >= 7 else today.year - 1
        academic_year = f"{year}/{year + 1}"
        period, created = EnrollmentPeriod.objects.get_or_create(
            academic_year=academic_year,
            period_type=PeriodType.BOTH,
            defaults={
                "start_date": today - timedelta(days=10),
                "end_date": today + timedelta(days=80),
                "is_open": True,
                "enrollment_fee": Decimal("75.00"),
                "insurance_general": Decimal("25.00"),
                "insurance_intensive": Decimal("40.00"),
                "created_by": actor,
            },
        )
        if not period.is_open:
            period.is_open = True
            period.save(update_fields=["is_open"])
        self.stdout.write(f"  {'+' if created else '·'} period {academic_year}")
        return period

    @transaction.atomic
    def _seed_enrollments(
        self, *, period: EnrollmentPeriod, users: dict[str, User], actor: User
    ) -> None:
        modalities = list(Modality.objects.all().order_by("pk")[:3])
        if not modalities:
            return

        rows = [
            # (parent, student, status, payment_status)
            (users["parent1"], users["student1"], EnrollmentStatus.APPROVED, PaymentStatus.CONFIRMED),
            (users["parent1"], users["student2"], EnrollmentStatus.UNDER_REVIEW, PaymentStatus.PENDING),
            (users["parent2"], users["student3"], EnrollmentStatus.SUBMITTED, PaymentStatus.PENDING),
        ]

        for parent, student, status, pay_status in rows:
            existing = Enrollment.objects.filter(
                period=period, student_email=student.email
            ).first()
            if existing:
                continue

            enrollment = Enrollment.objects.create(
                period=period,
                student=student,
                parent=parent,
                status=status,
                enrollment_type=EnrollmentType.NEW,
                student_email=student.email,
                student_name=student.full_name,
                student_date_of_birth=date(2014, 5, 14),
                parent_name=parent.full_name,
                parent_email=parent.email,
                parent_phone="912345678",
                parent_phone_country_code="+351",
                historical_notes="Tem aulas de dança desde os 4 anos.",
                created_by=actor,
            )
            for modality in modalities:
                EnrollmentModality.objects.create(
                    enrollment=enrollment, modality=modality, created_by=actor
                )
            for ctype in (ConsentType.RGPD, ConsentType.INTERNAL_REGULATION):
                EnrollmentConsent.objects.create(
                    enrollment=enrollment,
                    consent_type=ctype,
                    accepted=True,
                    accepted_at=timezone.now(),
                    ip_address="127.0.0.1",
                    user_agent="seed_demo_data",
                    created_by=actor,
                )

            EnrollmentPayment.objects.create(
                enrollment=enrollment,
                payment_type=PaymentType.ENROLLMENT_FEE,
                status=pay_status,
                amount=period.enrollment_fee,
                created_by=actor,
            )

    # ──────────────────────────────────────────────────────────────────────
    #  Teacher availability
    # ──────────────────────────────────────────────────────────────────────
    @transaction.atomic
    def _seed_teacher_availability(
        self, *, users: dict[str, User], actor: User
    ) -> None:
        teachers = [users["teacher1"], users["teacher2"], users["teacherext"]]
        now = timezone.now()
        base = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)

        for idx, teacher in enumerate(teachers):
            start = base + timedelta(days=idx)
            end = start + timedelta(hours=4)
            if TeacherAvailability.objects.filter(
                teacher=teacher, start_datetime=start, end_datetime=end
            ).exists():
                continue
            TeacherAvailability.objects.create(
                teacher=teacher,
                start_datetime=start,
                end_datetime=end,
                notes="Bloco de disponibilidade (seed).",
                created_by=actor,
            )

    # ──────────────────────────────────────────────────────────────────────
    #  Coachings
    # ──────────────────────────────────────────────────────────────────────
    @transaction.atomic
    def _seed_coachings(
        self,
        *,
        users: dict[str, User],
        studios: list[Studio],
        classes: list[Classe],
        actor: User,
    ) -> dict[str, CoachingClass]:
        teacher = users["teacher1"]
        teacher2 = users["teacher2"]
        student1 = users["student1"]
        student2 = users["student2"]
        student3 = users["student3"]

        modality = Modality.objects.first()
        studio = studios[0] if studios else None
        if modality is None or studio is None:
            return {}

        # Ensure studio is compatible with modality.
        StudioModality.objects.get_or_create(
            studio=studio, modality=modality, defaults={"created_by": actor}
        )

        now = timezone.now()
        scheduled_start = (now + timedelta(days=2)).replace(hour=15, minute=0, second=0, microsecond=0)
        scheduled_end = scheduled_start + timedelta(hours=1)

        requested_start = (now + timedelta(days=3)).replace(hour=11, minute=0, second=0, microsecond=0)
        requested_end = requested_start + timedelta(hours=1)

        past_start = (now - timedelta(days=3)).replace(hour=10, minute=0, second=0, microsecond=0)
        past_end = past_start + timedelta(hours=1)

        coachings: dict[str, CoachingClass] = {}

        # ── 1) SCHEDULED (visible on calendar + my coachings) ─────────────
        scheduled = CoachingClass.objects.filter(
            teacher=teacher, start_datetime=scheduled_start
        ).first()
        if scheduled is None:
            scheduled = CoachingClass.objects.create(
                teacher=teacher,
                modality=modality,
                studio=studio,
                status=CoachingStatus.SCHEDULED,
                start_datetime=scheduled_start,
                end_datetime=scheduled_end,
                total_price=Decimal("20.00"),
                is_billable=True,
                notes="Aula individual agendada (seed).",
                created_by=actor,
                classe=classes[0] if classes else None,
            )
            for student in (student1, student2):
                CoachingParticipant.objects.get_or_create(
                    coaching_class=scheduled,
                    student=student,
                    defaults={
                        "status": CoachingParticipantStatus.ACTIVE,
                        "invited_by_staff": True,
                        "created_by": actor,
                    },
                )
        coachings["scheduled"] = scheduled

        # ── 2) REQUESTED (student-driven, waiting on coordination) ────────
        requested = CoachingClass.objects.filter(
            teacher=teacher2, start_datetime=requested_start
        ).first()
        if requested is None:
            requested = CoachingClass.objects.create(
                teacher=teacher2,
                modality=modality,
                studio=None,
                status=CoachingStatus.REQUESTED,
                start_datetime=requested_start,
                end_datetime=requested_end,
                total_price=None,
                is_billable=True,
                notes="Pedido aluno (seed).",
                created_by=student3,
                requested_by=student3,
            )
            CoachingParticipant.objects.get_or_create(
                coaching_class=requested,
                student=student3,
                defaults={
                    "status": CoachingParticipantStatus.PENDING,
                    "invited_by_staff": False,
                    "created_by": student3,
                },
            )
        coachings["requested"] = requested

        # ── 3) COMPLETED past coaching (drives billing + fines pages) ─────
        completed = CoachingClass.objects.filter(
            teacher=teacher, start_datetime=past_start
        ).first()
        if completed is None:
            completed = CoachingClass.objects.create(
                teacher=teacher,
                modality=modality,
                studio=studio,
                status=CoachingStatus.COMPLETED,
                start_datetime=past_start,
                end_datetime=past_end,
                completed_at=past_end,
                total_price=Decimal("25.00"),
                is_billable=True,
                notes="Aula completada (seed).",
                teacher_confirmed_at=past_end,
                teacher_confirmed_by=teacher,
                created_by=actor,
            )

        # Roster: ATTENDED student1, ABSENT student2, LATE_CANCELLED student3.
        roster = [
            (student1, CoachingParticipantStatus.ATTENDED, None),
            (student2, CoachingParticipantStatus.ABSENT, FineReason.ABSENCE),
            (student3, CoachingParticipantStatus.LATE_CANCELLED, FineReason.LATE_CANCELLATION),
        ]
        for student, status, _ in roster:
            CoachingParticipant.objects.get_or_create(
                coaching_class=completed,
                student=student,
                defaults={
                    "status": status,
                    "invited_by_staff": True,
                    "created_by": actor,
                },
            )
        coachings["completed"] = completed
        coachings["_completed_roster"] = roster  # used by billing/fines step
        return coachings

    # ──────────────────────────────────────────────────────────────────────
    #  Billing + Fines
    # ──────────────────────────────────────────────────────────────────────
    @transaction.atomic
    def _seed_billing_and_fines(
        self,
        *,
        coachings: dict,
        users: dict[str, User],
        actor: User,
    ) -> None:
        completed: CoachingClass | None = coachings.get("completed")
        roster = coachings.get("_completed_roster") or []
        if completed is None or not roster:
            return

        for student, status, fine_reason in roster:
            participant = CoachingParticipant.objects.filter(
                coaching_class=completed, student=student
            ).first()
            if participant is None:
                continue

            if status == CoachingParticipantStatus.ATTENDED:
                BillingEntry.objects.get_or_create(
                    source_type=BillingEntrySourceType.COACHING,
                    coaching_class=completed,
                    student=student,
                    defaults={
                        "coaching_participant": participant,
                        "amount_due": completed.total_price or Decimal("0"),
                        "description": f"Aula {completed.modality.name}",
                        "status": BillingEntryStatus.PENDING,
                        "created_by": actor,
                    },
                )
                continue

            if fine_reason is None:
                continue

            fine, created = Fine.objects.get_or_create(
                coaching_participant=participant,
                defaults={
                    "coaching_class": completed,
                    "student": student,
                    "reason": fine_reason,
                    "status": FineStatus.PENDING_REVIEW,
                    "created_by": actor,
                },
            )

            # Approve one of them so the FINE-sourced billing entry has data.
            if fine_reason == FineReason.LATE_CANCELLATION and fine.status == FineStatus.PENDING_REVIEW:
                fine.status = FineStatus.APPROVED
                fine.amount = Decimal("10.00")
                fine.reviewed_at = timezone.now()
                fine.reviewed_by = users["coordination"]
                fine.save(update_fields=["status", "amount", "reviewed_at", "reviewed_by"])

                BillingEntry.objects.get_or_create(
                    source_type=BillingEntrySourceType.FINE,
                    fine=fine,
                    student=student,
                    defaults={
                        "amount_due": fine.amount,
                        "description": "Cancelamento tardio",
                        "status": BillingEntryStatus.PENDING,
                        "created_by": actor,
                    },
                )

    # ──────────────────────────────────────────────────────────────────────
    #  Events
    # ──────────────────────────────────────────────────────────────────────
    @transaction.atomic
    def _seed_events(
        self, *, users: dict[str, User], classes: list[Classe], actor: User
    ) -> None:
        defs = [
            {
                "title": "Espetáculo de Final de Ano",
                "description": "Espetáculo anual com todas as modalidades.",
                "body": "Mais informações em breve. Convidamos famílias e amigos.",
                "location": "Teatro Municipal",
                "event_date": timezone.now() + timedelta(days=45),
                "visibility_state": EventVisibilityState.PUBLISHED,
                "event_state": EventState.PLANNED,
                "published_at": timezone.now(),
                "with_post": True,
                "with_comment": True,
                "with_interest": True,
            },
            {
                "title": "Workshop de Hip-Hop",
                "description": "Workshop intensivo com convidado.",
                "body": "Aberto a alunos da escola e convidados.",
                "location": "Sala A",
                "event_date": timezone.now() + timedelta(days=14),
                "visibility_state": EventVisibilityState.DRAFT,
                "event_state": EventState.PLANNED,
                "published_at": None,
                "with_post": False,
                "with_comment": False,
                "with_interest": False,
            },
        ]
        for d in defs:
            event = Event.objects.filter(title=d["title"]).first()
            if event is None:
                event = Event.objects.create(
                    title=d["title"],
                    description=d["description"],
                    body=d["body"],
                    location=d["location"],
                    event_date=d["event_date"],
                    visibility_state=d["visibility_state"],
                    event_state=d["event_state"],
                    published_at=d["published_at"],
                    contact_info="info@studioos.dev",
                    created_by=actor,
                )
                if classes:
                    EventClassTarget.objects.get_or_create(
                        event=event, classe=classes[0], defaults={"created_by": actor}
                    )
            if d["with_post"]:
                EventPost.objects.get_or_create(
                    event=event,
                    title="Convocatória de ensaios",
                    defaults={
                        "body": "Os ensaios começam na próxima semana.",
                        "published_at": timezone.now(),
                        "created_by": actor,
                    },
                )
            if d["with_comment"]:
                EventComment.objects.get_or_create(
                    event=event,
                    owner=users["parent1"],
                    body="Vamos com toda a família!",
                    defaults={"created_by": users["parent1"]},
                )
            if d["with_interest"]:
                EventInterest.objects.get_or_create(
                    event=event,
                    user=users["student1"],
                    defaults={"created_by": users["student1"]},
                )

    # ──────────────────────────────────────────────────────────────────────
    #  Inventory — school products
    # ──────────────────────────────────────────────────────────────────────
    def _pick_size(self) -> Size | None:
        return Size.objects.filter(is_active=True).order_by("pk").first()

    def _pick_color(self) -> Color | None:
        return Color.objects.filter(is_active=True).order_by("pk").first()

    def _pick_category(self) -> Category | None:
        return Category.objects.filter(is_active=True).order_by("pk").first()

    @transaction.atomic
    def _seed_school_inventory(self, *, actor: User) -> list[ProductVariant]:
        category = self._pick_category()
        size = self._pick_size()
        color = self._pick_color()

        defs = [
            ("Collant Negro Adulto", "Collant clássico em malha matte.", "SCH-COL-001"),
            ("Sapatilhas de Meia-Ponta", "Sapatilhas em pele rosa.",      "SCH-SAP-002"),
        ]
        variants: list[ProductVariant] = []
        for name, description, sku in defs:
            product = Product.objects.filter(
                owner_type=Product.OwnerType.SCHOOL, name=name
            ).first()
            if product is None:
                product = Product.objects.create(
                    owner_type=Product.OwnerType.SCHOOL,
                    owner=None,
                    category=category,
                    name=name,
                    description=description,
                    target_gender="unisex",
                    brand="EnsArtes",
                    material="Algodão",
                    status=Product.Status.ACTIVE,
                    created_by=actor,
                )
                SchoolProductDetails.objects.create(
                    product=product,
                    inventory_code=sku,
                    storage_location="Armário 1",
                    notes="Seed.",
                    created_by=actor,
                )

            variant = ProductVariant.objects.filter(product=product, sku=sku).first()
            if variant is None:
                variant = ProductVariant.objects.create(
                    product=product,
                    size=size,
                    sku=sku,
                    condition=ProductVariant.Condition.GOOD,
                    status=ProductVariant.Status.AVAILABLE,
                    acquisition_type=ProductVariant.AcquisitionType.SCHOOL_OWNED,
                    acquired_at=timezone.now() - timedelta(days=60),
                    created_by=actor,
                )
                if color is not None:
                    VariantColor.objects.get_or_create(
                        variant=variant, color=color, defaults={"created_by": actor}
                    )
            variants.append(variant)
        return variants

    @transaction.atomic
    def _seed_member_inventory(self, *, users: dict[str, User]) -> list[ProductVariant]:
        category = self._pick_category()
        size = self._pick_size()
        color = self._pick_color()

        defs = [
            (users["parent1"], "Tutu Branco — usado", "Tutu de qualidade, pouco uso.", "MBR-TUT-001"),
            (users["student2"], "Sapatilhas Pontas Tam.36", "Sapatilhas usadas algumas vezes.", "MBR-PON-002"),
        ]
        variants: list[ProductVariant] = []
        for owner, name, description, sku in defs:
            product = Product.objects.filter(
                owner_type=Product.OwnerType.MEMBER, owner=owner, name=name
            ).first()
            if product is None:
                product = Product.objects.create(
                    owner_type=Product.OwnerType.MEMBER,
                    owner=owner,
                    category=category,
                    name=name,
                    description=description,
                    target_gender="female",
                    brand="—",
                    material="Tule",
                    status=Product.Status.ACTIVE,
                    created_by=owner,
                )
            variant = ProductVariant.objects.filter(product=product, sku=sku).first()
            if variant is None:
                variant = ProductVariant.objects.create(
                    product=product,
                    size=size,
                    sku=sku,
                    condition=ProductVariant.Condition.GOOD,
                    status=ProductVariant.Status.AVAILABLE,
                    acquisition_type=ProductVariant.AcquisitionType.PURCHASED,
                    acquired_at=timezone.now() - timedelta(days=200),
                    created_by=owner,
                )
                if color is not None:
                    VariantColor.objects.get_or_create(
                        variant=variant, color=color, defaults={"created_by": owner}
                    )
            variants.append(variant)
        return variants

    # ──────────────────────────────────────────────────────────────────────
    #  Marketplace
    # ──────────────────────────────────────────────────────────────────────
    @transaction.atomic
    def _seed_marketplace(
        self,
        *,
        school_variants: list[ProductVariant],
        member_variants: list[ProductVariant],
        users: dict[str, User],
        actor: User,
    ) -> None:
        listings_to_make = []
        if school_variants:
            listings_to_make.append({
                "variant": school_variants[0],
                "listing_type": Listing.ListingType.RENT,
                "title": "Aluguer — Collant Adulto",
                "description": "Disponível para alugar para espetáculos.",
                "asking_price": Decimal("8.00"),
                "is_public": True,
                "owner_user": users["direction"],
            })
        if len(school_variants) > 1:
            listings_to_make.append({
                "variant": school_variants[1],
                "listing_type": Listing.ListingType.LEND,
                "title": "Empréstimo — Sapatilhas Meia-Ponta",
                "description": "Empréstimo gratuito a alunas da escola.",
                "asking_price": None,
                "is_public": True,
                "owner_user": users["direction"],
            })
        if member_variants:
            listings_to_make.append({
                "variant": member_variants[0],
                "listing_type": Listing.ListingType.SELL,
                "title": "Venda — Tutu Branco",
                "description": "Pouco uso, ótimo estado.",
                "asking_price": Decimal("45.00"),
                "is_public": True,
                "owner_user": users["parent1"],
            })
        if len(member_variants) > 1:
            listings_to_make.append({
                "variant": member_variants[1],
                "listing_type": Listing.ListingType.DONATE,
                "title": "Doação — Sapatilhas de Pontas",
                "description": "Já não servem cá em casa.",
                "asking_price": None,
                "is_public": True,
                "owner_user": users["student2"],
            })

        for spec in listings_to_make:
            owner_user = spec.pop("owner_user")
            listing, _ = Listing.objects.get_or_create(
                variant=spec["variant"],
                title=spec["title"],
                defaults={
                    "listing_type": spec["listing_type"],
                    "status": Listing.ListingStatus.ACTIVE,
                    "description": spec["description"],
                    "asking_price": spec["asking_price"],
                    "is_public": spec["is_public"],
                    "created_by": owner_user,
                },
            )
            if listing.status != Listing.ListingStatus.ACTIVE:
                listing.status = Listing.ListingStatus.ACTIVE
                listing.save(update_fields=["status"])

            ListingFavorite.objects.get_or_create(
                listing=listing,
                user=users["student1"],
                defaults={"created_by": users["student1"]},
            )
            ListingComment.objects.get_or_create(
                listing=listing,
                owner=users["student1"],
                body="Ainda está disponível?",
                defaults={"created_by": users["student1"]},
            )

        # Pending product transaction (one).
        if member_variants:
            variant = member_variants[0]
            listing = Listing.objects.filter(variant=variant).first()
            owner = variant.product.owner or users["direction"]
            if listing is not None:
                ProductTransaction.objects.get_or_create(
                    listing=listing,
                    variant=variant,
                    requester=users["parent2"],
                    defaults={
                        "transaction_type": ProductTransaction.TransactionType.SELL,
                        "status": ProductTransaction.TransactionStatus.PENDING,
                        "owner": owner,
                        "agreed_price": Decimal("45.00"),
                        "notes": "Pedido demo.",
                        "created_by": users["parent2"],
                    },
                )

    # ──────────────────────────────────────────────────────────────────────
    #  Bookings
    # ──────────────────────────────────────────────────────────────────────
    @transaction.atomic
    def _seed_bookings(
        self,
        *,
        school_variants: list[ProductVariant],
        users: dict[str, User],
        actor: User,
    ) -> None:
        if not school_variants:
            return
        variant = school_variants[0]
        now = timezone.now()
        start_at = now + timedelta(days=10)
        end_at = now + timedelta(days=15)

        VariantBooking.objects.get_or_create(
            variant=variant,
            start_at=start_at,
            end_at=end_at,
            defaults={
                "booking_type": VariantBooking.BookingType.RESERVATION,
                "status": VariantBooking.Status.CONFIRMED,
                "title": "Reserva de demonstração",
                "notes": "Seed.",
                "approved_by_user": users["direction"],
                "created_by": actor,
            },
        )
