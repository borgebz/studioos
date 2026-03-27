from django.urls import path

from enrollments.views import (
    EnrollmentApproveView,
    EnrollmentCancelView,
    EnrollmentDetailView,
    EnrollmentListView,
    EnrollmentPaymentConfirmView,
    EnrollmentPaymentListCreateView,
    EnrollmentPeriodCloseView,
    EnrollmentPeriodDetailView,
    EnrollmentPeriodListCreateView,
    EnrollmentPeriodOpenView,
    EnrollmentRejectView,
    EnrollmentSubmitView,
)

app_name = "enrollments"

urlpatterns = [
    # Periods
    path("periods/", EnrollmentPeriodListCreateView.as_view(), name="period-list-create"),
    path("periods/<int:pk>/", EnrollmentPeriodDetailView.as_view(), name="period-detail"),
    path("periods/<int:pk>/open/", EnrollmentPeriodOpenView.as_view(), name="period-open"),
    path("periods/<int:pk>/close/", EnrollmentPeriodCloseView.as_view(), name="period-close"),

    # Enrollment submission
    path("", EnrollmentSubmitView.as_view(), name="enrollment-submit"),

    # Enrollment list / detail / update
    path("list/", EnrollmentListView.as_view(), name="enrollment-list"),
    path("<int:pk>/", EnrollmentDetailView.as_view(), name="enrollment-detail"),

    # Status transitions
    path("<int:pk>/approve/", EnrollmentApproveView.as_view(), name="enrollment-approve"),
    path("<int:pk>/reject/", EnrollmentRejectView.as_view(), name="enrollment-reject"),
    path("<int:pk>/cancel/", EnrollmentCancelView.as_view(), name="enrollment-cancel"),

    # Payments
    path("<int:pk>/payments/", EnrollmentPaymentListCreateView.as_view(), name="enrollment-payments"),
    path(
        "<int:pk>/payments/<int:payment_pk>/confirm/",
        EnrollmentPaymentConfirmView.as_view(),
        name="enrollment-payment-confirm",
    ),
]