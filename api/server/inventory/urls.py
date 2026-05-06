from django.urls import path
from inventory.views.size_system_views import (
    SizeSystemView,
    SizeSystemDetailView,
    SizeSystemActivateView,
    SizeSystemDeactivateView,
)
from inventory.views.size_views import (
    SizeView,
    SizeDeleteView,
    SizeActivateView,
    SizeDeactivateView,
)
from inventory.views.category_views import (
    CategoryView,
    CategoryDetailView,
    CategoryActivateView,
    CategoryDeactivateView,
)

from inventory.views.color_views import (
    ColorListCreateView,
    ColorDetailView,
    ColorActivateView,
    ColorDeactivateView,
)

from inventory.views.product_views import (
    ProductListCreateView,
    ProductDetailView,
    SchoolProductListCreateView,
    SchoolProductDetailView,
)

from inventory.views.product_variant_views import (
    ProductVariantListCreateView,
    ProductVariantDetailView,
)
from inventory.views.variant_booking_views import (
    BookingDetailView,
    BookingListCreateView,
)

urlpatterns = [
    path("size-systems/", SizeSystemView.as_view()),
    path("size-systems/<int:size_system_id>/", SizeSystemDetailView.as_view()),
    path("size-systems/<int:size_system_id>/activate/", SizeSystemActivateView.as_view()),
    path(
        "size-systems/<int:size_system_id>/deactivate/",
        SizeSystemDeactivateView.as_view(),
    ),
    path("sizes/", SizeView.as_view()),
    path("sizes/<int:size_id>/", SizeDeleteView.as_view()),
    path("sizes/<int:size_id>/activate/", SizeActivateView.as_view()),
    path("sizes/<int:size_id>/deactivate/", SizeDeactivateView.as_view()),
    path("categories/", CategoryView.as_view()),
    path("categories/<int:category_id>/", CategoryDetailView.as_view()),
    path("categories/<int:category_id>/activate/", CategoryActivateView.as_view()),
    path("categories/<int:category_id>/deactivate/", CategoryDeactivateView.as_view()),
    path("colors/", ColorListCreateView.as_view()),
    path("colors/<int:color_id>/", ColorDetailView.as_view()),
    path("colors/<int:color_id>/activate/", ColorActivateView.as_view()),
    path("colors/<int:color_id>/deactivate/", ColorDeactivateView.as_view()),
    path("products/", ProductListCreateView.as_view()),
    path("products/<int:pk>/", ProductDetailView.as_view()),
    path("school/products/", SchoolProductListCreateView.as_view()),
    path("school/products/<int:pk>/", SchoolProductDetailView.as_view()),
    path("products/<int:product_id>/variants/", ProductVariantListCreateView.as_view()),
    path("variants/<int:variant_id>/", ProductVariantDetailView.as_view()),
    path("variants/<int:variant_id>/bookings/", BookingListCreateView.as_view()),
    path("bookings/<int:booking_id>/", BookingDetailView.as_view()),
]
