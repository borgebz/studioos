from django.urls import path
from billing import views

app_name = "billing"

urlpatterns = [
    path("coachings/", views.CoachingBillingListView.as_view(), name="coaching-bill-list"),
    path("fines/", views.FineListCreateView.as_view(), name="fine-list-create"),
    path("fines/<int:pk>/", views.FineDetailView.as_view(), name="fine-detail"),
]