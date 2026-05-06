from django.urls import path

from marketplace.views.listing_views import (
    FavoriteListingsView,
    ListingAvailabilityView,
    ListingDetailView,
    ListingFavoriteView,
    ListingListCreateView,
    ListingPublishView,
    ListingUnpublishView,
    MyListingsView,
    SchoolListingDetailView,
    SchoolListingListCreateView,
    SchoolListingPublishView,
    SchoolListingUnpublishView,
)
from marketplace.views.transaction_views import (
    MyTransactionsView,
    SchoolTransactionAcceptView,
    SchoolTransactionBlockView,
    SchoolTransactionCompleteView,
    SchoolTransactionDetailView,
    SchoolTransactionListView,
    SchoolTransactionRejectView,
    SchoolTransactionUnblockView,
    TransactionCancelView,
    TransactionDetailView,
    TransactionRequestView,
)

urlpatterns = [
    # ------------------------------------------------------------------
    # Member-facing listings
    # ------------------------------------------------------------------
    path("listings/", ListingListCreateView.as_view()),
    path("listings/mine/", MyListingsView.as_view()),
    path("listings/favorites/", FavoriteListingsView.as_view()),
    path("listings/<int:listing_id>/", ListingDetailView.as_view()),
    path("listings/<int:listing_id>/publish/", ListingPublishView.as_view()),
    path("listings/<int:listing_id>/unpublish/", ListingUnpublishView.as_view()),
    path("listings/<int:listing_id>/favorite/", ListingFavoriteView.as_view()),
    path("listings/<int:listing_id>/availability/", ListingAvailabilityView.as_view()),
    path("listings/<int:listing_id>/request/", TransactionRequestView.as_view()),
    # ------------------------------------------------------------------
    # Member-facing transactions
    # ------------------------------------------------------------------
    path("transactions/mine/", MyTransactionsView.as_view()),
    path("transactions/<int:transaction_id>/", TransactionDetailView.as_view()),
    path("transactions/<int:transaction_id>/cancel/", TransactionCancelView.as_view()),
    # ------------------------------------------------------------------
    # School-scoped listings (staff / coordination)
    # ------------------------------------------------------------------
    path("school/listings/", SchoolListingListCreateView.as_view()),
    path("school/listings/<int:listing_id>/", SchoolListingDetailView.as_view()),
    path(
        "school/listings/<int:listing_id>/publish/", SchoolListingPublishView.as_view()
    ),
    path(
        "school/listings/<int:listing_id>/unpublish/",
        SchoolListingUnpublishView.as_view(),
    ),
    # ------------------------------------------------------------------
    # School-scoped transactions (staff / coordination)
    # ------------------------------------------------------------------
    path("school/transactions/", SchoolTransactionListView.as_view()),
    path(
        "school/transactions/<int:transaction_id>/",
        SchoolTransactionDetailView.as_view(),
    ),
    path(
        "school/transactions/<int:transaction_id>/accept/",
        SchoolTransactionAcceptView.as_view(),
    ),
    path(
        "school/transactions/<int:transaction_id>/reject/",
        SchoolTransactionRejectView.as_view(),
    ),
    path(
        "school/transactions/<int:transaction_id>/complete/",
        SchoolTransactionCompleteView.as_view(),
    ),
    path(
        "school/transactions/<int:transaction_id>/block/",
        SchoolTransactionBlockView.as_view(),
    ),
    path(
        "school/transactions/<int:transaction_id>/unblock/",
        SchoolTransactionUnblockView.as_view(),
    ),
]
