from django.urls import path

from billing import views

app_name = "billing"

urlpatterns = [
    # Billing entries
    path("entries/", views.BillingEntryListView.as_view(), name="billing-entry-list"),
    path(
        "entries/<int:pk>/",
        views.BillingEntryDetailView.as_view(),
        name="billing-entry-detail",
    ),
    path(
        "entries/<int:pk>/cancel/",
        views.BillingEntryCancelView.as_view(),
        name="billing-entry-cancel",
    ),
    # Fines
    path("fines/", views.FineListView.as_view(), name="fine-list"),
    path("fines/<int:pk>/", views.FineDetailView.as_view(), name="fine-detail"),
    path(
        "fines/<int:pk>/approve/",
        views.FineApproveView.as_view(),
        name="fine-approve",
    ),
    path(
        "fines/<int:pk>/waive/",
        views.FineWaiveView.as_view(),
        name="fine-waive",
    ),
]
