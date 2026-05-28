"""
Seed demo data covering every page on the web client.

Idempotent: re-running creates missing records, refreshes a few mutable fields,
and skips rows already present. Bypasses some state machines (e.g. coaching
completion) so the seeded snapshot has rows in every status the UI lists.

Usage (from a host machine that has docker compose up):

    docker compose run --rm api uv run python manage.py seed_demo_data

Or from the script wrapper at scripts/seed_demo_data.sh.

All users share the same email host (default ``@studioos.dev``) and password
``123456``.

Image/file downloads at run time
--------------------------------
Profile photos, event covers, product images and a few demo PDFs are pulled
from public CDNs (Unsplash, Vinted, DiceBear) the first time the seed runs;
subsequent runs skip the download because the FileField is already populated.
Network failures are tolerated — the row keeps its empty field and the seed
moves on. See ``_demo_assets.py`` for the URL catalogue and helpers.
"""

from __future__ import annotations

import logging
from datetime import date, time, timedelta
from decimal import Decimal

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import Profile, Role, User
from availability.models import RecurringAvailability, TeacherAvailability
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
    RecurrenceType,
    RecurringCoaching,
)
from enrollments.models import (
    ConsentType,
    Enrollment,
    EnrollmentConsent,
    EnrollmentFile,
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
    EventFile,
    EventInterest,
    EventPost,
    EventState,
    EventVisibilityState,
)
from inventory.models import (
    Category,
    Color,
    Product,
    ProductMedia,
    ProductVariant,
    SchoolProductDetails,
    Size,
    VariantBooking,
    VariantColor,
    VariantMedia,
)
from marketplace.models import (
    Listing,
    ListingComment,
    ListingFavorite,
    ProductTransaction,
)
from messaging.models import (
    Conversation,
    ConversationKind,
    ConversationParticipant,
    Message,
    MessageKind,
    MessageReaction,
)
from modality.models import Modality, UserModality
from studios.models import Studio, StudioModality

from . import _demo_assets as assets

logger = logging.getLogger(__name__)

DEFAULT_PASSWORD = "123456"
DEFAULT_HOST = "studioos.dev"


# Email handle → (first_name, last_name, role_code)
USER_SPECS = [
    ("direction", "Diana", "Director", "direction"),
    ("coordination", "Carla", "Coord", "coordination"),
    ("collaborator", "Caio", "Helper", "collaborator"),
    ("teacher1", "Tomas", "Almeida", "teacher"),
    ("teacher2", "Teresa", "Santos", "teacher"),
    ("teacherext", "Tiago", "Ribeiro", "teacher_external"),
    ("parent1", "Patricia", "Pereira", "parent"),
    ("parent2", "Paulo", "Costa", "parent"),
    ("student1", "Sofia", "Lima", "student"),
    ("student2", "Sara", "Martins", "student"),
    ("student3", "Simao", "Ferreira", "student"),
    ("student4", "Sabrina", "Gomes", "student"),
]

# Per-handle profile bios. Keyed for the new richer profile copy.
PROFILE_BIOS = {
    "direction": "Direção pedagógica. 20+ anos a coreografar e dirigir espetáculos.",
    "coordination": "Coordenação geral — horários, mapas de sala e contactos com encarregados.",
    "collaborator": "Equipa administrativa, apoio em ensaios e logística de espetáculos.",
    "teacher1": "Bailarino profissional. Especializado em ballet clássico e contemporâneo.",
    "teacher2": "Coreógrafa convidada. Hip-hop, jazz e teatro musical.",
    "teacherext": "Professor externo — acrobática e flexibilidade.",
    "parent1": "Mãe de duas bailarinas, fã número 1 dos espetáculos de final de ano.",
    "parent2": "Pai do Simão. Disponível para apoiar logística nos espetáculos.",
    "student1": "Bailarina, escalão juvenil. Ballet clássico e contemporâneo.",
    "student2": "Aluna desde os 6 anos. Pontas e contemporâneo.",
    "student3": "Hip-hop e acrodance. Adora workshops.",
    "student4": "Estreante este ano em jazz e ballet.",
}


# ─── Helpers reused across methods ────────────────────────────────────────────


def _ensure_image(instance, field_name: str, url_pool: list[str], *, hint: str):
    """
    Download and assign an image to ``instance.<field_name>`` when the field
    is empty. Never raises; if the download fails the field stays empty.
    Saves the instance with ``update_fields=[field_name]``.
    """
    current = getattr(instance, field_name, None)
    if current and getattr(current, "name", ""):
        return False
    f = assets.first_working_image(url_pool, filename_hint=hint)
    if f is None:
        return False
    setattr(instance, field_name, f)
    instance.save(update_fields=[field_name])
    return True


# ──────────────────────────────────────────────────────────────────────────────
#  Command
# ──────────────────────────────────────────────────────────────────────────────


class Command(BaseCommand):
    help = "Populate the database with rich demo data covering every web page."

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
        parser.add_argument(
            "--skip-media",
            action="store_true",
            help="Skip image/file downloads (useful when running offline).",
        )

    def handle(self, *args, **opts):
        host = opts["host"]
        password = opts["password"]
        self.skip_media = opts.get("skip_media", False)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Applying migrations"))
        call_command("migrate", verbosity=0, interactive=False)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Pre-seeding catalog data"))
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

        self.stdout.write(self.style.MIGRATE_HEADING("→ Users + Profiles + Photos"))
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

        self.stdout.write(
            self.style.MIGRATE_HEADING("→ Enrollment period + enrollments + files")
        )
        period = self._seed_enrollment_period(actor=actor)
        self._seed_enrollments(period=period, users=users, actor=actor)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Teacher availability"))
        self._seed_teacher_availability(users=users, actor=actor)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Coachings (all states)"))
        coachings = self._seed_coachings(
            users=users, studios=studios, classes=classes, actor=actor
        )

        self.stdout.write(
            self.style.MIGRATE_HEADING("→ Recurring coaching pattern (weekly)")
        )
        self._seed_recurring_coaching(
            users=users, studios=studios, classes=classes, actor=actor
        )

        self.stdout.write(self.style.MIGRATE_HEADING("→ Billing + Fines (full mix)"))
        self._seed_billing_and_fines(coachings=coachings, users=users, actor=actor)

        self.stdout.write(
            self.style.MIGRATE_HEADING("→ Events (all states + covers + files)")
        )
        self._seed_events(users=users, classes=classes, actor=actor)

        self.stdout.write(self.style.MIGRATE_HEADING("→ School inventory + media"))
        school_variants = self._seed_school_inventory(actor=actor)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Member inventory + media"))
        member_variants = self._seed_member_inventory(users=users)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Marketplace listings"))
        listings = self._seed_marketplace(
            school_variants=school_variants,
            member_variants=member_variants,
            users=users,
            actor=actor,
        )

        self.stdout.write(self.style.MIGRATE_HEADING("→ Marketplace transactions"))
        self._seed_transactions(
            member_variants=member_variants,
            school_variants=school_variants,
            listings=listings,
            users=users,
        )

        self.stdout.write(self.style.MIGRATE_HEADING("→ Variant bookings"))
        self._seed_bookings(school_variants=school_variants, users=users, actor=actor)

        self.stdout.write(self.style.MIGRATE_HEADING("→ Messaging (DM + Group + linked)"))
        self._seed_messaging(users=users, coachings=coachings, listings=listings)

        self.stdout.write(self.style.SUCCESS("\n✓ Demo data seeded."))
        self.stdout.write(
            "\n  Login at the web client with any of:\n"
            + "\n".join(f"    {h}@{host}  /  {password}" for h, *_ in USER_SPECS)
        )

    # ──────────────────────────────────────────────────────────────────────
    #  Users + Profiles + Photos
    # ──────────────────────────────────────────────────────────────────────
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

            with transaction.atomic():
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
                    user.save(
                        update_fields=[
                            "first_name",
                            "last_name",
                            "is_active",
                            "password",
                        ]
                    )

                # Realistic contact details, deterministic per handle.
                if not user.phone:
                    user.phone = f"9{12345670 + len(users):08d}"[:9]
                    user.phone_country_code = "+351"
                if not user.nationality:
                    user.nationality = "Portuguesa"
                if not user.address:
                    user.address = "Rua de São Bento, 100 — Lisboa"
                if not user.postal_code:
                    user.postal_code = "1200-100"
                if not user.nif:
                    user.nif = f"5000{12345670 + len(users):05d}"[:9]
                if user.date_of_birth is None:
                    user.date_of_birth = date(2010, 5, 14) if role_code == "student" else date(1985, 3, 21)
                user.save(
                    update_fields=[
                        "phone",
                        "phone_country_code",
                        "nationality",
                        "address",
                        "postal_code",
                        "nif",
                        "date_of_birth",
                    ]
                )

                user.groups.clear()
                user.groups.add(role.group)
                users[handle] = user

                profile, _ = Profile.objects.get_or_create(
                    user=user,
                    defaults={
                        "display_name": f"{first_name} {last_name}",
                        "bio": PROFILE_BIOS.get(handle, ""),
                    },
                )
                # Refresh bio + display_name on each run.
                profile.display_name = f"{first_name} {last_name}"
                profile.bio = PROFILE_BIOS.get(handle, profile.bio)
                profile.save(update_fields=["display_name", "bio"])

                if not self.skip_media:
                    _ensure_image(
                        profile,
                        "photo",
                        [assets.avatar_url(handle)],
                        hint=f"avatar-{handle}",
                    )

        return users

    # ──────────────────────────────────────────────────────────────────────
    #  Studios
    # ──────────────────────────────────────────────────────────────────────
    @transaction.atomic
    def _seed_studios(self, *, actor: User) -> list[Studio]:
        defs = [
            (
                "Sala A — Espelhos",
                25,
                "Sala principal com chão de linóleo, espelhos full-height e barras "
                "fixas. Ideal para ballet clássico, contemporâneo e ensaios gerais.",
            ),
            (
                "Sala B — Barre",
                18,
                "Sala dedicada a clássico e barre, com piso flutuante e duas paredes "
                "de espelho.",
            ),
            (
                "Sala C — Acro",
                12,
                "Sala equipada com tapetes de queda, blocos e elásticos — acrodance, "
                "flexibilidade e ginástica acrobática.",
            ),
            (
                "Sala D — Black Box",
                30,
                "Sala multifunções, configurável como caixa preta para passagens de "
                "cena e ensaios de espetáculo.",
            ),
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
            if not created and not obj.description:
                obj.description = desc
                obj.save(update_fields=["description"])
            studios.append(obj)
            self.stdout.write(f"  {'+' if created else '·'} {obj.name}")
        return studios

    @transaction.atomic
    def _seed_studio_modalities(self, *, studios: list[Studio], actor: User) -> None:
        modalities = list(Modality.objects.all().order_by("pk"))
        if not modalities:
            return
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
        modalities = list(Modality.objects.all().order_by("pk")[:9])
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
            (users["parent2"], users["student4"]),
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
            (
                "Turma A — Ballet Infantil",
                "Crianças entre os 5 e 7 anos. Aulas semanais com preparação para "
                "primeiro exame da Royal Academy of Dance.",
            ),
            (
                "Turma B — Contemporâneo Juvenil",
                "Dança contemporânea, 12-15 anos. Trabalho coreográfico para o "
                "espetáculo de fim de ano.",
            ),
            (
                "Turma C — Hip-Hop Iniciação",
                "Iniciação ao hip-hop, todas as idades. Workshop mensal com "
                "convidados.",
            ),
        ]
        students = [
            users["student1"],
            users["student2"],
            users["student3"],
            users["student4"],
        ]
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

    def _seed_enrollments(
        self, *, period: EnrollmentPeriod, users: dict[str, User], actor: User
    ) -> None:
        modalities = list(Modality.objects.all().order_by("pk")[:3])
        if not modalities:
            return

        # (parent, student, enrollment_status, payment_status, include_insurance, attach_file)
        rows = [
            (
                users["parent1"],
                users["student1"],
                EnrollmentStatus.APPROVED,
                PaymentStatus.CONFIRMED,
                True,
                True,
            ),
            (
                users["parent1"],
                users["student2"],
                EnrollmentStatus.UNDER_REVIEW,
                PaymentStatus.PENDING,
                False,
                True,
            ),
            (
                users["parent2"],
                users["student3"],
                EnrollmentStatus.SUBMITTED,
                PaymentStatus.PENDING,
                False,
                False,
            ),
            (
                users["parent2"],
                users["student4"],
                EnrollmentStatus.REJECTED,
                PaymentStatus.PENDING,
                False,
                True,
            ),
        ]

        for parent, student, status, pay_status, with_insurance, with_file in rows:
            with transaction.atomic():
                existing = Enrollment.objects.filter(
                    period=period, student_email=student.email
                ).first()
                enrollment = existing
                if enrollment is None:
                    enrollment = Enrollment.objects.create(
                        period=period,
                        student=student,
                        parent=parent,
                        status=status,
                        enrollment_type=EnrollmentType.NEW,
                        student_email=student.email,
                        student_name=student.full_name,
                        student_date_of_birth=date(2014, 5, 14),
                        student_nif=f"3000{student.pk:05d}"[:9],
                        student_nationality="Portuguesa",
                        student_document_number=f"CC{student.pk:08d}",
                        address="Rua de São Bento, 100 — Lisboa",
                        postal_code="1200-100",
                        parent_name=parent.full_name,
                        parent_email=parent.email,
                        parent_phone="912345678",
                        parent_phone_country_code="+351",
                        historical_notes=(
                            "Tem aulas de dança desde os 4 anos, com 2 anos em "
                            "ballet e 1 ano em contemporâneo. Sem lesões a reportar."
                        ),
                        created_by=actor,
                    )
                    for modality in modalities:
                        EnrollmentModality.objects.create(
                            enrollment=enrollment,
                            modality=modality,
                            created_by=actor,
                        )
                    for ctype in (
                        ConsentType.RGPD,
                        ConsentType.INTERNAL_REGULATION,
                    ):
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
                        confirmed_by=users["direction"] if pay_status == PaymentStatus.CONFIRMED else None,
                        created_by=actor,
                    )
                    if with_insurance:
                        EnrollmentPayment.objects.create(
                            enrollment=enrollment,
                            payment_type=PaymentType.INSURANCE,
                            status=pay_status,
                            amount=period.insurance_general,
                            confirmed_by=users["direction"] if pay_status == PaymentStatus.CONFIRMED else None,
                            created_by=actor,
                        )

                if (
                    with_file
                    and not self.skip_media
                    and not EnrollmentFile.objects.filter(
                        enrollment=enrollment
                    ).exists()
                ):
                    pdf = assets.make_pdf(
                        f"Comprovativo de Pagamento — {student.full_name}",
                        [
                            f"Aluno: {student.full_name}",
                            f"Encarregado de educação: {parent.full_name}",
                            f"Ano letivo: {period.academic_year}",
                            f"Montante: {period.enrollment_fee} EUR",
                            "Método: Transferência bancária",
                            "Referência: ENS-2025-00042",
                            "",
                            "Documento gerado automaticamente para demonstração.",
                        ],
                    )
                    EnrollmentFile.objects.create(
                        enrollment=enrollment,
                        file=pdf,
                        original_filename=pdf.name,
                        mime_type="application/pdf",
                        created_by=parent,
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
        base = (now + timedelta(days=1)).replace(
            hour=9, minute=0, second=0, microsecond=0
        )

        for idx, teacher in enumerate(teachers):
            start = base + timedelta(days=idx)
            end = start + timedelta(hours=4)
            block = TeacherAvailability.objects.filter(
                teacher=teacher, start_datetime=start, end_datetime=end
            ).first()
            if block is None:
                block = TeacherAvailability.objects.create(
                    teacher=teacher,
                    start_datetime=start,
                    end_datetime=end,
                    notes="Bloco de disponibilidade (seed).",
                    created_by=actor,
                )
            # Attach a recurring rule to the first teacher so the
            # "Recurring availability" tab has data.
            if idx == 0 and not hasattr(block, "recurring"):
                RecurringAvailability.objects.get_or_create(
                    availability=block,
                    defaults={
                        "days_of_week": "0,2,4",  # Mon/Wed/Fri
                        "start_time": time(9, 0),
                        "end_time": time(13, 0),
                        "valid_from": timezone.localdate(),
                        "valid_until": timezone.localdate() + timedelta(days=90),
                    },
                )

    # ──────────────────────────────────────────────────────────────────────
    #  Coachings — cover every status the UI lists
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
        student1, student2, student3, student4 = (
            users["student1"],
            users["student2"],
            users["student3"],
            users["student4"],
        )

        modality = Modality.objects.first()
        modality2 = Modality.objects.order_by("pk")[1] if Modality.objects.count() > 1 else modality
        studio = studios[0] if studios else None
        if modality is None or studio is None:
            return {}

        StudioModality.objects.get_or_create(
            studio=studio, modality=modality, defaults={"created_by": actor}
        )

        now = timezone.now()
        coachings: dict[str, CoachingClass] = {}

        def _slot(days: int, hour: int = 15) -> tuple:
            start = (now + timedelta(days=days)).replace(
                hour=hour, minute=0, second=0, microsecond=0
            )
            return start, start + timedelta(hours=1)

        # ── 1) SCHEDULED ─────────────────────────────────────────────────
        s_start, s_end = _slot(2, 15)
        scheduled = CoachingClass.objects.filter(
            teacher=teacher, start_datetime=s_start
        ).first()
        if scheduled is None:
            scheduled = CoachingClass.objects.create(
                teacher=teacher,
                modality=modality,
                studio=studio,
                status=CoachingStatus.SCHEDULED,
                start_datetime=s_start,
                end_datetime=s_end,
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

        # ── 2) REQUESTED (student-driven) ─────────────────────────────────
        r_start, r_end = _slot(3, 11)
        requested = CoachingClass.objects.filter(
            teacher=teacher2, start_datetime=r_start
        ).first()
        if requested is None:
            requested = CoachingClass.objects.create(
                teacher=teacher2,
                modality=modality,
                studio=None,
                status=CoachingStatus.REQUESTED,
                start_datetime=r_start,
                end_datetime=r_end,
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

        # ── 3) PENDING_APPROVAL ───────────────────────────────────────────
        pa_start, pa_end = _slot(4, 18)
        pending_approval = CoachingClass.objects.filter(
            teacher=teacher, start_datetime=pa_start
        ).first()
        if pending_approval is None:
            pending_approval = CoachingClass.objects.create(
                teacher=teacher,
                modality=modality2,
                studio=studio,
                status=CoachingStatus.PENDING_APPROVAL,
                start_datetime=pa_start,
                end_datetime=pa_end,
                is_billable=True,
                notes="Professor aceitou, aguarda coordenação.",
                created_by=student4,
                requested_by=student4,
            )
            CoachingParticipant.objects.get_or_create(
                coaching_class=pending_approval,
                student=student4,
                defaults={
                    "status": CoachingParticipantStatus.PENDING,
                    "created_by": student4,
                },
            )
        coachings["pending_approval"] = pending_approval

        # ── 4) WAITING_CONFIRMATION ───────────────────────────────────────
        wc_start, wc_end = _slot(5, 14)
        waiting = CoachingClass.objects.filter(
            teacher=teacher2, start_datetime=wc_start
        ).first()
        if waiting is None:
            waiting = CoachingClass.objects.create(
                teacher=teacher2,
                modality=modality,
                studio=studio,
                status=CoachingStatus.WAITING_CONFIRMATION,
                start_datetime=wc_start,
                end_datetime=wc_end,
                total_price=Decimal("18.00"),
                is_billable=True,
                notes="Coordenação marcou, aguarda confirmação do professor.",
                created_by=actor,
            )
            CoachingParticipant.objects.get_or_create(
                coaching_class=waiting,
                student=student1,
                defaults={
                    "status": CoachingParticipantStatus.ACTIVE,
                    "invited_by_staff": True,
                    "created_by": actor,
                },
            )
        coachings["waiting_confirmation"] = waiting

        # ── 5) REJECTED ───────────────────────────────────────────────────
        rj_start, rj_end = _slot(6, 16)
        rejected = CoachingClass.objects.filter(
            teacher=teacher, start_datetime=rj_start
        ).first()
        if rejected is None:
            rejected = CoachingClass.objects.create(
                teacher=teacher,
                modality=modality,
                studio=None,
                status=CoachingStatus.REJECTED,
                start_datetime=rj_start,
                end_datetime=rj_end,
                is_billable=True,
                rejection_reason="Horário não compatível com a agenda.",
                rejected_at=timezone.now(),
                notes="Pedido recusado (seed).",
                created_by=student2,
                requested_by=student2,
            )
            CoachingParticipant.objects.get_or_create(
                coaching_class=rejected,
                student=student2,
                defaults={
                    "status": CoachingParticipantStatus.CANCELLED,
                    "created_by": student2,
                },
            )
        coachings["rejected"] = rejected

        # ── 6) CANCELLED ──────────────────────────────────────────────────
        cn_start, cn_end = _slot(7, 10)
        cancelled = CoachingClass.objects.filter(
            teacher=teacher, start_datetime=cn_start
        ).first()
        if cancelled is None:
            cancelled = CoachingClass.objects.create(
                teacher=teacher,
                modality=modality,
                studio=studio,
                status=CoachingStatus.CANCELLED,
                start_datetime=cn_start,
                end_datetime=cn_end,
                total_price=Decimal("15.00"),
                is_billable=False,
                cancellation_reason="Aluna doente, aula remarcada.",
                cancelled_at=timezone.now(),
                notes="Cancelada (seed).",
                created_by=actor,
            )
        coachings["cancelled"] = cancelled

        # ── 7) COMPLETED (past) ──────────────────────────────────────────
        past_start = (now - timedelta(days=3)).replace(
            hour=10, minute=0, second=0, microsecond=0
        )
        past_end = past_start + timedelta(hours=1)
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

        # Roster on the completed one drives billing/fines.
        roster = [
            (student1, CoachingParticipantStatus.ATTENDED, None),
            (student2, CoachingParticipantStatus.ABSENT, FineReason.ABSENCE),
            (
                student3,
                CoachingParticipantStatus.LATE_CANCELLED,
                FineReason.LATE_CANCELLATION,
            ),
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
        coachings["_completed_roster"] = roster

        return coachings

    # ──────────────────────────────────────────────────────────────────────
    #  Recurring coaching pattern
    # ──────────────────────────────────────────────────────────────────────
    @transaction.atomic
    def _seed_recurring_coaching(
        self,
        *,
        users: dict[str, User],
        studios: list[Studio],
        classes: list[Classe],
        actor: User,
    ) -> None:
        teacher = users["teacher1"]
        modality = Modality.objects.first()
        studio = studios[1] if len(studios) > 1 else None
        if modality is None or studio is None:
            return

        StudioModality.objects.get_or_create(
            studio=studio, modality=modality, defaults={"created_by": actor}
        )

        # Avoid creating a second pattern on subsequent runs.
        existing_pattern = RecurringCoaching.objects.filter(
            notes__contains="seed-weekly-ballet"
        ).first()
        if existing_pattern is not None:
            return

        pattern = RecurringCoaching.objects.create(
            recurrence_type=RecurrenceType.WEEKLY,
            recurrence_interval=1,
            days_of_week="TU",
            end_date=timezone.localdate() + timedelta(days=70),
            notes="seed-weekly-ballet — recurrence demo.",
            created_by=actor,
        )

        # Generate 3 sessions (1 past, 2 future) so the pattern looks real.
        now = timezone.now()
        slots = [
            now + timedelta(days=-7),
            now + timedelta(days=0),
            now + timedelta(days=7),
        ]
        for i, slot in enumerate(slots):
            start = slot.replace(hour=17, minute=0, second=0, microsecond=0)
            end = start + timedelta(hours=1)
            status = (
                CoachingStatus.COMPLETED if i == 0 else CoachingStatus.SCHEDULED
            )
            session = CoachingClass.objects.create(
                teacher=teacher,
                modality=modality,
                studio=studio,
                status=status,
                start_datetime=start,
                end_datetime=end,
                total_price=Decimal("20.00"),
                is_billable=True,
                notes=f"Sessão recorrente {i + 1}/3 (seed).",
                created_by=actor,
                classe=classes[1] if len(classes) > 1 else None,
                recurring_coaching=pattern,
                completed_at=end if status == CoachingStatus.COMPLETED else None,
                teacher_confirmed_at=end if status == CoachingStatus.COMPLETED else None,
                teacher_confirmed_by=teacher if status == CoachingStatus.COMPLETED else None,
            )
            CoachingParticipant.objects.get_or_create(
                coaching_class=session,
                student=users["student1"],
                defaults={
                    "status": (
                        CoachingParticipantStatus.ATTENDED
                        if status == CoachingStatus.COMPLETED
                        else CoachingParticipantStatus.ACTIVE
                    ),
                    "invited_by_staff": True,
                    "created_by": actor,
                },
            )

    # ──────────────────────────────────────────────────────────────────────
    #  Billing + Fines (full mix of states)
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
                entry, _ = BillingEntry.objects.get_or_create(
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
                # Flip half-the-month-old entries to EXPORTED for variety.
                if (
                    student.email.startswith("student1")
                    and entry.status == BillingEntryStatus.PENDING
                ):
                    entry.status = BillingEntryStatus.EXPORTED
                    entry.exported_at = timezone.now()
                    entry.save(update_fields=["status", "exported_at"])
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

            if (
                fine_reason == FineReason.LATE_CANCELLATION
                and fine.status == FineStatus.PENDING_REVIEW
            ):
                fine.status = FineStatus.APPROVED
                fine.amount = Decimal("10.00")
                fine.reviewed_at = timezone.now()
                fine.reviewed_by = users["coordination"]
                fine.save(
                    update_fields=["status", "amount", "reviewed_at", "reviewed_by"]
                )

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

        # Add one WAIVED fine for completeness so the fines page has every state.
        any_participant = CoachingParticipant.objects.filter(
            coaching_class=completed,
            status=CoachingParticipantStatus.ABSENT,
        ).first()
        if any_participant is not None:
            absence_fine = Fine.objects.filter(
                coaching_participant=any_participant
            ).first()
            if absence_fine and absence_fine.status == FineStatus.PENDING_REVIEW:
                # Leave one in PENDING_REVIEW; create an extra historical
                # waived fine only if we have spare history. Skip to avoid
                # uniqueness-per-participant constraint.
                pass

    # ──────────────────────────────────────────────────────────────────────
    #  Events
    # ──────────────────────────────────────────────────────────────────────
    def _seed_events(
        self, *, users: dict[str, User], classes: list[Classe], actor: User
    ) -> None:
        defs = [
            {
                "title": "Espetáculo de Final de Ano",
                "description": "Espetáculo anual com todas as modalidades.",
                "body": (
                    "Estamos a preparar o nosso espetáculo de final de ano! "
                    "Convidamos famílias, amigos e antigos alunos para se "
                    "juntarem a nós. Bilhetes disponíveis na secretaria."
                ),
                "location": "Teatro Municipal — Auditório Principal",
                "event_date": timezone.now() + timedelta(days=45),
                "visibility_state": EventVisibilityState.PUBLISHED,
                "event_state": EventState.PLANNED,
                "published_at": timezone.now(),
                "cover_pool": assets.EVENT_BALLET + assets.EVENT_THEATRE,
                "with_post": True,
                "with_comment": True,
                "with_interest": True,
                "with_file": True,
                "target_all_classes": True,
            },
            {
                "title": "Workshop de Hip-Hop com Convidado",
                "description": "Workshop intensivo de hip-hop com convidado internacional.",
                "body": (
                    "Aberto a alunos da escola e convidados. Material a trazer: "
                    "roupa confortável, água e energia."
                ),
                "location": "Sala A — Espelhos",
                "event_date": timezone.now() + timedelta(days=14),
                "visibility_state": EventVisibilityState.DRAFT,
                "event_state": EventState.PLANNED,
                "published_at": None,
                "cover_pool": assets.EVENT_HIP_HOP,
                "with_post": False,
                "with_comment": False,
                "with_interest": False,
                "with_file": False,
            },
            {
                "title": "Audições para Núcleo Pré-Profissional",
                "description": "Audições para o núcleo pré-profissional 2026/27.",
                "body": (
                    "Inscrições abertas para audições do núcleo pré-profissional. "
                    "Idades 14-17. Limite de 25 candidatos."
                ),
                "location": "Sala B — Barre",
                "event_date": timezone.now() + timedelta(days=21),
                "visibility_state": EventVisibilityState.SCHEDULED,
                "event_state": EventState.PLANNED,
                "published_at": None,
                "publication_scheduled_at": timezone.now() + timedelta(days=2),
                "cover_pool": assets.EVENT_CONTEMPORARY,
                "with_post": False,
                "with_comment": True,
                "with_interest": True,
                "with_file": True,
            },
            {
                "title": "Festival de Jazz da Escola",
                "description": "Festival celebrando a primeira década de jazz na escola.",
                "body": (
                    "Festival de jazz com todas as turmas — performances ao vivo, "
                    "improvisação e convidados especiais."
                ),
                "location": "Pátio da Escola",
                "event_date": timezone.now() - timedelta(days=30),
                "visibility_state": EventVisibilityState.PUBLISHED,
                "event_state": EventState.COMPLETED,
                "published_at": timezone.now() - timedelta(days=60),
                "cover_pool": assets.EVENT_JAZZ,
                "with_post": True,
                "with_comment": True,
                "with_interest": True,
                "with_file": False,
            },
            {
                "title": "Mostra de Contemporâneo (cancelado)",
                "description": "Mostra de contemporâneo cancelada por motivos logísticos.",
                "body": "Evento cancelado por indisponibilidade do espaço.",
                "location": "—",
                "event_date": timezone.now() + timedelta(days=10),
                "visibility_state": EventVisibilityState.PUBLISHED,
                "event_state": EventState.CANCELLED,
                "published_at": timezone.now() - timedelta(days=5),
                "cover_pool": assets.EVENT_CONTEMPORARY,
                "with_post": False,
                "with_comment": True,
                "with_interest": False,
                "with_file": False,
            },
            {
                "title": "Open Day — Sala Aberta (arquivado)",
                "description": "Edição passada da nossa sala aberta para curiosos.",
                "body": "Edição arquivada. Veja o vídeo na área de arquivo.",
                "location": "Toda a escola",
                "event_date": timezone.now() - timedelta(days=180),
                "visibility_state": EventVisibilityState.ARCHIVED,
                "event_state": EventState.COMPLETED,
                "published_at": timezone.now() - timedelta(days=200),
                "cover_pool": assets.STUDIO_INTERIOR,
                "with_post": False,
                "with_comment": False,
                "with_interest": False,
                "with_file": False,
            },
        ]

        for d in defs:
            with transaction.atomic():
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
                        published_at=d.get("published_at"),
                        publication_scheduled_at=d.get("publication_scheduled_at"),
                        contact_info="info@studioos.dev",
                        created_by=actor,
                    )
                # Target all classes when requested so the home feed has reach.
                if classes:
                    targets = classes if d.get("target_all_classes") else classes[:1]
                    for classe in targets:
                        EventClassTarget.objects.get_or_create(
                            event=event,
                            classe=classe,
                            defaults={"created_by": actor},
                        )

                if not self.skip_media:
                    _ensure_image(
                        event,
                        "cover_photo",
                        d.get("cover_pool") or assets.EVENT_THEATRE,
                        hint=f"event-{event.pk}",
                    )

                if d["with_post"]:
                    EventPost.objects.get_or_create(
                        event=event,
                        title="Convocatória de ensaios",
                        defaults={
                            "body": (
                                "Os ensaios começam na próxima semana. "
                                "Por favor confirmem presença até quinta-feira."
                            ),
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
                    EventInterest.objects.get_or_create(
                        event=event,
                        user=users["parent1"],
                        defaults={"created_by": users["parent1"]},
                    )

                if (
                    d["with_file"]
                    and not self.skip_media
                    and not EventFile.objects.filter(event=event).exists()
                ):
                    pdf = assets.make_pdf(
                        f"Programa — {event.title}",
                        [
                            f"Local: {event.location}",
                            f"Data: {event.event_date.strftime('%d/%m/%Y %H:%M')}",
                            "Programa:",
                            "  • Abertura — turmas iniciação",
                            "  • Bloco Ballet Clássico",
                            "  • Bloco Contemporâneo",
                            "  • Hip-Hop — convidados",
                            "  • Final — todos no palco",
                            "",
                            "Duração estimada: 2h com intervalo.",
                        ],
                    )
                    EventFile.objects.create(
                        event=event,
                        file=pdf,
                        file_name=pdf.name,
                        created_by=actor,
                    )

    # ──────────────────────────────────────────────────────────────────────
    #  Inventory — school products (broader set, with media)
    # ──────────────────────────────────────────────────────────────────────
    def _pick_category(self, name: str) -> Category | None:
        return Category.objects.filter(name=name, is_active=True).first()

    def _pick_size(self, name: str = "M") -> Size | None:
        return (
            Size.objects.filter(name=name, is_active=True).first()
            or Size.objects.filter(is_active=True).order_by("pk").first()
        )

    def _pick_color(self, name: str | None = None) -> Color | None:
        if name:
            color = Color.objects.filter(name=name, is_active=True).first()
            if color:
                return color
        return Color.objects.filter(is_active=True).order_by("pk").first()

    @transaction.atomic
    def _seed_school_inventory(self, *, actor: User) -> list[ProductVariant]:
        # (category, name, description, sku, size, color, image_pool, unsplash_fallback)
        defs = [
            (
                "Collants e Bodies",
                "Collant Negro Adulto",
                "Collant clássico em malha matte, manga curta.",
                "SCH-COL-001",
                "M",
                "Black",
                assets.VINTED_LEOTARDS,
                assets.UNSPLASH_DANCEWEAR,
            ),
            (
                "Sapatilhas de Ballet",
                "Sapatilhas de Meia-Ponta",
                "Sapatilhas em pele rosa, sola dividida.",
                "SCH-SAP-002",
                "37",
                "Pink",
                assets.VINTED_BALLET_SHOES,
                assets.UNSPLASH_SHOES,
            ),
            (
                "Tutus e Vestidos de Ballet",
                "Tutu Plateau Branco",
                "Tutu plateau profissional, várias camadas de tule.",
                "SCH-TUT-003",
                "S",
                "White",
                assets.VINTED_TUTUS_KIDS,
                assets.UNSPLASH_TUTUS,
            ),
            (
                "Pontas",
                "Sapatilhas de Pontas Avançado",
                "Pontas para alunas em nível avançado, com caixa reforçada.",
                "SCH-PON-004",
                "38",
                "Pink",
                assets.VINTED_BALLET_SHOES,
                assets.UNSPLASH_SHOES,
            ),
            (
                "Sapatilhas de Hip-Hop",
                "Ténis de Hip-Hop Pretos",
                "Ténis para hip-hop, sola plana e bico reforçado.",
                "SCH-HHP-005",
                "39",
                "Black",
                assets.VINTED_HIP_HOP_SHOES,
                assets.UNSPLASH_SHOES,
            ),
            (
                "Sapatilhas de Jazz",
                "Sapatos de Jazz Pretos",
                "Sapatos de jazz, gáspea elástica.",
                "SCH-JAZ-006",
                "37",
                "Black",
                assets.VINTED_JAZZ_SHOES,
                assets.UNSPLASH_SHOES,
            ),
            (
                "Leggings e Calças",
                "Leggings de Treino Cinzentas",
                "Leggings de algodão, cintura alta.",
                "SCH-LEG-007",
                "M",
                "Gray",
                assets.VINTED_COLLANTS,
                assets.UNSPLASH_DANCEWEAR,
            ),
            (
                "Saias de Ensaio",
                "Saia de Ensaio Preta",
                "Saia de chiffon preta para aulas de clássico.",
                "SCH-SAI-008",
                "M",
                "Black",
                assets.VINTED_TUTUS_KIDS,
                assets.UNSPLASH_TUTUS,
            ),
            (
                "Meias-Pontas e Coberturas",
                "Almofadas de Pontas",
                "Almofadas em silicone para pontas.",
                "SCH-MPT-009",
                None,
                None,
                assets.VINTED_BALLET_SHOES,
                assets.UNSPLASH_SHOES,
            ),
            (
                "Figurinos de Espetáculo",
                "Figurino Coppélia (Aldeia)",
                "Vestido tradicional para Coppélia, ato I.",
                "SCH-FIG-010",
                "S",
                "Red",
                assets.VINTED_TUTUS_KIDS,
                assets.UNSPLASH_TUTUS,
            ),
            (
                "Tiaras e Adereços de Cabeça",
                "Tiara de Strass",
                "Tiara para figurinos de gala.",
                "SCH-TIA-011",
                None,
                None,
                assets.UNSPLASH_DANCEWEAR,
                assets.UNSPLASH_DANCEWEAR,
            ),
            (
                "Material de Treino",
                "Bloco de Yoga (par)",
                "Par de blocos de cortiça para alongamento.",
                "SCH-BLK-012",
                None,
                None,
                assets.STUDIO_INTERIOR,
                assets.STUDIO_INTERIOR,
            ),
        ]

        variants: list[ProductVariant] = []
        for (
            cat_name,
            name,
            description,
            sku,
            size_name,
            color_name,
            primary_pool,
            fallback_pool,
        ) in defs:
            category = self._pick_category(cat_name) or self._pick_category(
                "Collants e Bodies"
            )
            size = self._pick_size(size_name) if size_name else None
            color = self._pick_color(color_name) if color_name else None

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
                    material="Algodão / Mistura",
                    status=Product.Status.ACTIVE,
                    created_by=actor,
                )
                SchoolProductDetails.objects.create(
                    product=product,
                    inventory_code=sku,
                    storage_location="Armário Sala A",
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
                        variant=variant,
                        color=color,
                        defaults={"created_by": actor},
                    )

            self._attach_product_media(
                product=product,
                variant=variant,
                pools=[primary_pool, fallback_pool],
                hint=f"sch-{sku}",
                actor=actor,
            )
            variants.append(variant)
        return variants

    @transaction.atomic
    def _seed_member_inventory(
        self, *, users: dict[str, User]
    ) -> list[ProductVariant]:
        defs = [
            (
                users["parent1"],
                "Tutu Branco — usado",
                "Tutu de qualidade, pouco uso. Cresceu, agora é pequeno.",
                "MBR-TUT-001",
                "Tutus e Vestidos de Ballet",
                "S",
                "White",
                assets.VINTED_TUTUS_KIDS,
                assets.UNSPLASH_TUTUS,
            ),
            (
                users["student2"],
                "Sapatilhas Pontas Tam.36",
                "Sapatilhas usadas algumas vezes em aulas de pontas.",
                "MBR-PON-002",
                "Pontas",
                "36",
                "Pink",
                assets.VINTED_BALLET_SHOES,
                assets.UNSPLASH_SHOES,
            ),
            (
                users["parent2"],
                "Collant Azul Marinho",
                "Collant de manga comprida, azul-marinho. Estado ótimo.",
                "MBR-COL-003",
                "Collants e Bodies",
                "S",
                "Blue",
                assets.VINTED_LEOTARDS,
                assets.UNSPLASH_DANCEWEAR,
            ),
            (
                users["student1"],
                "Saia de Ensaio Rosa",
                "Saia rosa usada nos últimos 2 anos.",
                "MBR-SAI-004",
                "Saias de Ensaio",
                "M",
                "Pink",
                assets.VINTED_TUTUS_KIDS,
                assets.UNSPLASH_TUTUS,
            ),
            (
                users["parent1"],
                "Ténis Hip-Hop Tam.38",
                "Ténis hip-hop, comprados há 6 meses. Pouco uso.",
                "MBR-HHP-005",
                "Sapatilhas de Hip-Hop",
                "38",
                "Black",
                assets.VINTED_HIP_HOP_SHOES,
                assets.UNSPLASH_SHOES,
            ),
            (
                users["student3"],
                "Leggings de Treino Pretas",
                "Leggings pretas, ótimo estado.",
                "MBR-LEG-006",
                "Leggings e Calças",
                "M",
                "Black",
                assets.VINTED_COLLANTS,
                assets.UNSPLASH_DANCEWEAR,
            ),
        ]
        variants: list[ProductVariant] = []
        for (
            owner,
            name,
            description,
            sku,
            cat_name,
            size_name,
            color_name,
            primary_pool,
            fallback_pool,
        ) in defs:
            category = self._pick_category(cat_name)
            size = self._pick_size(size_name)
            color = self._pick_color(color_name)

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
                    material="Misto",
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
                        variant=variant,
                        color=color,
                        defaults={"created_by": owner},
                    )
            self._attach_product_media(
                product=product,
                variant=variant,
                pools=[primary_pool, fallback_pool],
                hint=f"mbr-{sku}",
                actor=owner,
            )
            variants.append(variant)
        return variants

    def _attach_product_media(
        self,
        *,
        product: Product,
        variant: ProductVariant,
        pools: list[list[str]],
        hint: str,
        actor: User,
    ) -> None:
        """
        Attach up to two images to the product. First image is primary and
        wired to the variant via VariantMedia.
        """
        if self.skip_media:
            return
        if ProductMedia.objects.filter(product=product).exists():
            # Already populated on a previous run.
            return

        primary_pool = pools[0] if pools else []
        fallback_pool = pools[1] if len(pools) > 1 else []
        combined = primary_pool + fallback_pool

        first = assets.first_working_image(combined, filename_hint=f"{hint}-primary")
        if first is None:
            return
        media1 = ProductMedia.objects.create(
            product=product,
            image=first,
            is_primary=True,
            sort_order=0,
            created_by=actor,
        )
        VariantMedia.objects.get_or_create(
            variant=variant,
            product_media=media1,
            defaults={"created_by": actor},
        )

        # Try a second image from any remaining URL not used above.
        # (Best-effort: skip if download fails — the product still has its
        # primary image.)
        second = assets.first_working_image(
            combined[1:], filename_hint=f"{hint}-secondary"
        )
        if second is not None:
            media2 = ProductMedia.objects.create(
                product=product,
                image=second,
                is_primary=False,
                sort_order=1,
                created_by=actor,
            )
            VariantMedia.objects.get_or_create(
                variant=variant,
                product_media=media2,
                defaults={"created_by": actor},
            )

    # ──────────────────────────────────────────────────────────────────────
    #  Marketplace (listings + transactions)
    # ──────────────────────────────────────────────────────────────────────
    @transaction.atomic
    def _seed_marketplace(
        self,
        *,
        school_variants: list[ProductVariant],
        member_variants: list[ProductVariant],
        users: dict[str, User],
        actor: User,
    ) -> dict[str, Listing]:
        listings: dict[str, Listing] = {}
        plan = []

        if school_variants:
            plan.append(
                {
                    "key": "school_rent_collant",
                    "variant": school_variants[0],
                    "listing_type": Listing.ListingType.RENT,
                    "title": "Aluguer — Collant Adulto",
                    "description": "Disponível para alugar para espetáculos.",
                    "asking_price": Decimal("8.00"),
                    "status": Listing.ListingStatus.ACTIVE,
                    "is_public": True,
                    "owner_user": users["direction"],
                }
            )
        if len(school_variants) > 1:
            plan.append(
                {
                    "key": "school_lend_shoes",
                    "variant": school_variants[1],
                    "listing_type": Listing.ListingType.LEND,
                    "title": "Empréstimo — Sapatilhas Meia-Ponta",
                    "description": "Empréstimo gratuito a alunas da escola.",
                    "asking_price": None,
                    "status": Listing.ListingStatus.ACTIVE,
                    "is_public": True,
                    "owner_user": users["direction"],
                }
            )
        if len(school_variants) > 2:
            plan.append(
                {
                    "key": "school_rent_tutu",
                    "variant": school_variants[2],
                    "listing_type": Listing.ListingType.RENT,
                    "title": "Aluguer — Tutu Plateau",
                    "description": "Tutu plateau profissional, disponível para espetáculos.",
                    "asking_price": Decimal("25.00"),
                    "status": Listing.ListingStatus.ACTIVE,
                    "is_public": True,
                    "owner_user": users["direction"],
                }
            )
        if len(school_variants) > 9:
            plan.append(
                {
                    "key": "school_draft_figurino",
                    "variant": school_variants[9],
                    "listing_type": Listing.ListingType.RENT,
                    "title": "Aluguer — Figurino Coppélia (rascunho)",
                    "description": "Em preparação. Disponível depois do espetáculo de Junho.",
                    "asking_price": Decimal("40.00"),
                    "status": Listing.ListingStatus.DRAFT,
                    "is_public": False,
                    "owner_user": users["direction"],
                }
            )

        if member_variants:
            plan.append(
                {
                    "key": "member_sell_tutu",
                    "variant": member_variants[0],
                    "listing_type": Listing.ListingType.SELL,
                    "title": "Venda — Tutu Branco",
                    "description": "Pouco uso, ótimo estado.",
                    "asking_price": Decimal("45.00"),
                    "status": Listing.ListingStatus.ACTIVE,
                    "is_public": True,
                    "owner_user": users["parent1"],
                }
            )
        if len(member_variants) > 1:
            plan.append(
                {
                    "key": "member_donate_pontas",
                    "variant": member_variants[1],
                    "listing_type": Listing.ListingType.DONATE,
                    "title": "Doação — Sapatilhas de Pontas",
                    "description": "Já não servem cá em casa.",
                    "asking_price": None,
                    "status": Listing.ListingStatus.ACTIVE,
                    "is_public": True,
                    "owner_user": users["student2"],
                }
            )
        if len(member_variants) > 2:
            plan.append(
                {
                    "key": "member_sell_collant",
                    "variant": member_variants[2],
                    "listing_type": Listing.ListingType.SELL,
                    "title": "Venda — Collant Azul Marinho",
                    "description": "Estado ótimo, comprado há 1 ano.",
                    "asking_price": Decimal("20.00"),
                    "status": Listing.ListingStatus.ACTIVE,
                    "is_public": True,
                    "owner_user": users["parent2"],
                }
            )
        if len(member_variants) > 3:
            plan.append(
                {
                    "key": "member_lend_skirt",
                    "variant": member_variants[3],
                    "listing_type": Listing.ListingType.LEND,
                    "title": "Empréstimo — Saia Rosa",
                    "description": "Disponível para empréstimo entre alunas.",
                    "asking_price": None,
                    "status": Listing.ListingStatus.ACTIVE,
                    "is_public": True,
                    "owner_user": users["student1"],
                }
            )
        if len(member_variants) > 4:
            plan.append(
                {
                    "key": "member_closed_hiphop",
                    "variant": member_variants[4],
                    "listing_type": Listing.ListingType.SELL,
                    "title": "Venda — Ténis Hip-Hop Tam.38 (fechado)",
                    "description": "Já vendido — listagem encerrada.",
                    "asking_price": Decimal("18.00"),
                    "status": Listing.ListingStatus.CLOSED,
                    "is_public": True,
                    "owner_user": users["parent1"],
                }
            )

        for spec in plan:
            owner_user = spec["owner_user"]
            listing, created = Listing.objects.get_or_create(
                variant=spec["variant"],
                title=spec["title"],
                defaults={
                    "listing_type": spec["listing_type"],
                    "status": spec["status"],
                    "description": spec["description"],
                    "asking_price": spec["asking_price"],
                    "is_public": spec["is_public"],
                    "created_by": owner_user,
                },
            )
            if not created and listing.status != spec["status"]:
                listing.status = spec["status"]
                listing.save(update_fields=["status"])

            if spec["status"] == Listing.ListingStatus.ACTIVE:
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
            listings[spec["key"]] = listing
        return listings

    @transaction.atomic
    def _seed_transactions(
        self,
        *,
        member_variants: list[ProductVariant],
        school_variants: list[ProductVariant],
        listings: dict[str, Listing],
        users: dict[str, User],
    ) -> None:
        # PENDING transaction on member tutu.
        if "member_sell_tutu" in listings:
            listing = listings["member_sell_tutu"]
            ProductTransaction.objects.get_or_create(
                listing=listing,
                variant=listing.variant,
                requester=users["parent2"],
                defaults={
                    "transaction_type": ProductTransaction.TransactionType.SELL,
                    "status": ProductTransaction.TransactionStatus.PENDING,
                    "owner": listing.variant.product.owner or users["direction"],
                    "agreed_price": Decimal("45.00"),
                    "notes": "Pedido demo (PENDING).",
                    "created_by": users["parent2"],
                },
            )

        # ACCEPTED transaction on member collant.
        if "member_sell_collant" in listings:
            listing = listings["member_sell_collant"]
            ProductTransaction.objects.get_or_create(
                listing=listing,
                variant=listing.variant,
                requester=users["student1"],
                defaults={
                    "transaction_type": ProductTransaction.TransactionType.SELL,
                    "status": ProductTransaction.TransactionStatus.ACCEPTED,
                    "owner": listing.variant.product.owner or users["direction"],
                    "agreed_price": Decimal("20.00"),
                    "notes": "Aceite, à espera de entrega.",
                    "created_by": users["student1"],
                },
            )

        # COMPLETED transaction on member hip-hop shoes (also closes listing).
        if "member_closed_hiphop" in listings:
            listing = listings["member_closed_hiphop"]
            tx, _ = ProductTransaction.objects.get_or_create(
                listing=listing,
                variant=listing.variant,
                requester=users["student3"],
                defaults={
                    "transaction_type": ProductTransaction.TransactionType.SELL,
                    "status": ProductTransaction.TransactionStatus.COMPLETED,
                    "owner": listing.variant.product.owner or users["direction"],
                    "agreed_price": Decimal("18.00"),
                    "notes": "Vendido e entregue.",
                    "created_by": users["student3"],
                },
            )
            # Generate a marketplace billing entry.
            BillingEntry.objects.get_or_create(
                source_type=BillingEntrySourceType.MARKETPLACE,
                marketplace_transaction=tx,
                student=users["student3"],
                defaults={
                    "amount_due": tx.agreed_price or Decimal("0"),
                    "description": f"Compra: {listing.title}",
                    "status": BillingEntryStatus.PENDING,
                    "created_by": users["direction"],
                },
            )

        # REJECTED transaction on member donate.
        if "member_donate_pontas" in listings:
            listing = listings["member_donate_pontas"]
            ProductTransaction.objects.get_or_create(
                listing=listing,
                variant=listing.variant,
                requester=users["parent2"],
                defaults={
                    "transaction_type": ProductTransaction.TransactionType.DONATE,
                    "status": ProductTransaction.TransactionStatus.REJECTED,
                    "owner": listing.variant.product.owner or users["direction"],
                    "notes": "Não aceitou o pedido.",
                    "created_by": users["parent2"],
                },
            )

    # ──────────────────────────────────────────────────────────────────────
    #  Bookings — multiple types/states
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
        now = timezone.now()

        def _create(variant, *, booking_type, status, days_from, length_days, title):
            start = now + timedelta(days=days_from)
            end = start + timedelta(days=length_days)
            VariantBooking.objects.get_or_create(
                variant=variant,
                start_at=start,
                end_at=end,
                defaults={
                    "booking_type": booking_type,
                    "status": status,
                    "title": title,
                    "notes": "Seed.",
                    "approved_by_user": users["direction"],
                    "created_by": actor,
                },
            )

        _create(
            school_variants[0],
            booking_type=VariantBooking.BookingType.RESERVATION,
            status=VariantBooking.Status.CONFIRMED,
            days_from=10,
            length_days=5,
            title="Reserva de demonstração",
        )
        if len(school_variants) > 1:
            _create(
                school_variants[1],
                booking_type=VariantBooking.BookingType.LOAN,
                status=VariantBooking.Status.PENDING,
                days_from=20,
                length_days=3,
                title="Empréstimo pendente",
            )
        if len(school_variants) > 2:
            _create(
                school_variants[2],
                booking_type=VariantBooking.BookingType.SCHOOL_USE,
                status=VariantBooking.Status.CONFIRMED,
                days_from=2,
                length_days=2,
                title="Uso interno — ensaio geral",
            )
        if len(school_variants) > 3:
            _create(
                school_variants[3],
                booking_type=VariantBooking.BookingType.MAINTENANCE,
                status=VariantBooking.Status.BLOCKED,
                days_from=14,
                length_days=4,
                title="Manutenção (pontas)",
            )

        # One completed booking (with actual_* dates) for history.
        if len(school_variants) > 4:
            past_start = now - timedelta(days=20)
            past_end = now - timedelta(days=15)
            booking, created = VariantBooking.objects.get_or_create(
                variant=school_variants[4],
                start_at=past_start,
                end_at=past_end,
                defaults={
                    "booking_type": VariantBooking.BookingType.LOAN,
                    "status": VariantBooking.Status.COMPLETED,
                    "title": "Empréstimo concluído",
                    "notes": "Seed.",
                    "actual_start_at": past_start + timedelta(hours=2),
                    "actual_end_at": past_end - timedelta(hours=2),
                    "approved_by_user": users["direction"],
                    "created_by": actor,
                },
            )

    # ──────────────────────────────────────────────────────────────────────
    #  Messaging
    # ──────────────────────────────────────────────────────────────────────
    def _ensure_participant(self, conv: Conversation, user: User, *, is_admin: bool = False):
        ConversationParticipant.objects.get_or_create(
            conversation=conv,
            user=user,
            defaults={"is_admin": is_admin},
        )

    def _send(
        self,
        conv: Conversation,
        sender: User,
        body: str,
        *,
        kind: str = MessageKind.USER,
        reactions: dict[User, str] | None = None,
    ) -> Message:
        msg, created = Message.objects.get_or_create(
            conversation=conv,
            sender=sender,
            body=body,
            defaults={"kind": kind},
        )
        if created and reactions:
            for user, emoji in reactions.items():
                MessageReaction.objects.get_or_create(
                    message=msg,
                    user=user,
                    emoji=emoji,
                )
        return msg

    @transaction.atomic
    def _seed_messaging(
        self,
        *,
        users: dict[str, User],
        coachings: dict,
        listings: dict[str, Listing],
    ) -> None:
        # 1) DM between parent1 and coordination. ``Conversation`` has no
        # natural key for a DM, so look up by participant set first to keep
        # the seed idempotent.
        dm = (
            Conversation.objects.filter(
                kind=ConversationKind.DIRECT,
                participants=users["parent1"],
            )
            .filter(participants=users["coordination"])
            .first()
        )
        if dm is None:
            dm = Conversation.objects.create(kind=ConversationKind.DIRECT)
        # When the DM already existed, make sure both participants are linked.
        self._ensure_participant(dm, users["parent1"])
        self._ensure_participant(dm, users["coordination"])
        self._send(
            dm,
            users["parent1"],
            "Bom dia! A Sofia pode chegar 10 minutos atrasada hoje?",
        )
        self._send(
            dm,
            users["coordination"],
            "Bom dia! Sem problema, a professora foi informada.",
            reactions={users["parent1"]: "👍"},
        )

        # 2) GROUP — parent reps
        group, _ = Conversation.objects.get_or_create(
            kind=ConversationKind.GROUP,
            name="Representantes de Pais",
            defaults={},
        )
        for u, admin in [
            (users["direction"], True),
            (users["coordination"], False),
            (users["parent1"], False),
            (users["parent2"], False),
        ]:
            self._ensure_participant(group, u, is_admin=admin)
        self._send(
            group,
            users["direction"],
            "Olá! Criei este grupo para tratarmos da logística do espetáculo.",
            kind=MessageKind.SYSTEM,
        )
        self._send(
            group,
            users["coordination"],
            "Bem-vindos! Vou partilhar a calendarização de ensaios na próxima semana.",
        )
        self._send(
            group,
            users["parent1"],
            "Eu posso ajudar com o transporte das crianças no dia D.",
            reactions={users["direction"]: "🙌", users["parent2"]: "❤️"},
        )
        self._send(
            group,
            users["parent2"],
            "Eu trato dos cartazes — tenho contacto de uma gráfica.",
        )

        # 3) COACHING-linked thread
        scheduled = coachings.get("scheduled")
        if scheduled is not None:
            coaching_conv, _ = Conversation.objects.get_or_create(
                kind=ConversationKind.COACHING,
                coaching=scheduled,
                defaults={"name": ""},
            )
            for u in (scheduled.teacher, users["student1"], users["student2"], users["coordination"]):
                self._ensure_participant(coaching_conv, u)
            self._send(
                coaching_conv,
                scheduled.teacher,
                "Olá! Lembrem-se de trazer pontas para esta aula.",
            )
            self._send(
                coaching_conv,
                users["student1"],
                "Combinado! 👍",
            )
            self._send(
                coaching_conv,
                users["student2"],
                "Vou tentar levar dois pares, ainda estou a partir as últimas.",
            )

        # 4) LISTING-linked thread between buyer & seller.
        listing = listings.get("member_sell_tutu")
        if listing is not None:
            seller = listing.variant.product.owner or users["direction"]
            buyer = users["parent2"]
            listing_conv, _ = Conversation.objects.get_or_create(
                kind=ConversationKind.LISTING,
                listing=listing,
                defaults={"name": ""},
            )
            self._ensure_participant(listing_conv, seller)
            self._ensure_participant(listing_conv, buyer)
            self._send(
                listing_conv,
                buyer,
                "Olá! Continua disponível? Posso passar pela escola amanhã.",
            )
            self._send(
                listing_conv,
                seller,
                "Olá! Sim, está disponível. Amanhã às 18h funciona?",
                reactions={buyer: "👌"},
            )
