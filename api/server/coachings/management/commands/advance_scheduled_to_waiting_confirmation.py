from django.core.management.base import BaseCommand
from django.utils import timezone

from coachings.services import advance_scheduled_to_waiting_confirmation_batch


class Command(BaseCommand):
    help = (
        "Move coachings from SCHEDULED to WAITING_CONFIRMATION when the session end time "
        "has passed (same logic a future cron job should call). "
        "Uses advance_scheduled_to_waiting_confirmation_batch() — no duplicate rules here."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print how many would transition without writing (counts eligible rows only).",
        )

    def handle(self, *args, **options):
        now = timezone.now()
        if options["dry_run"]:
            from coachings.services import eligible_scheduled_coachings_queryset

            n = eligible_scheduled_coachings_queryset(now=now).count()
            self.stdout.write(
                self.style.WARNING(
                    f"Dry-run: {n} coaching(s) eligible (end <= now, status=scheduled)."
                )
            )
            return

        count = advance_scheduled_to_waiting_confirmation_batch(now=now)
        self.stdout.write(
            self.style.SUCCESS(
                f"Advanced {count} coaching(s) to waiting_confirmation (now={now.isoformat()})."
            )
        )
