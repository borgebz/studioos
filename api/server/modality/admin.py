from django.contrib import admin

from modality.models import Modality


@admin.register(Modality)
class ModalityAdmin(admin.ModelAdmin):
    list_display = ("name", "max_capacity", "created_at")
    search_fields = ("name",)
