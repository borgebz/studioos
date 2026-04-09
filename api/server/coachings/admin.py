from django.contrib import admin

from coachings.models import CoachingClass, CoachingParticipant, TeacherAvailability


@admin.register(TeacherAvailability)
class TeacherAvailabilityAdmin(admin.ModelAdmin):
    list_display = ("id", "teacher", "modality", "start_datetime", "end_datetime")
    list_filter = ("modality",)


@admin.register(CoachingClass)
class CoachingClassAdmin(admin.ModelAdmin):
    list_display = ("id", "status", "teacher", "modality", "studio", "start_datetime")
    list_filter = ("status", "modality")


@admin.register(CoachingParticipant)
class CoachingParticipantAdmin(admin.ModelAdmin):
    list_display = ("id", "coaching_class", "student", "cancelled_at")
