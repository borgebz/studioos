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
    ColorListCreateApi,
    ColorDetailApi,
    ColorActivateApi,
    ColorDeactivateApi,
)

from inventory.views.product_views import (
    ProductListCreateView,
    ProductDetailView,
    SchoolProductListCreateView,
    SchoolProductDetailView,
)

urlpatterns = [
    path("size-systems/", SizeSystemView.as_view()),
    path("size-systems/<int:sizeSystemId>/", SizeSystemDetailView.as_view()),
    path("size-systems/<int:sizeSystemId>/activate/", SizeSystemActivateView.as_view()),
    path(
        "size-systems/<int:sizeSystemId>/deactivate/",
        SizeSystemDeactivateView.as_view(),
    ),
    path("sizes/", SizeView.as_view()),
    path("sizes/<int:sizeId>/", SizeDeleteView.as_view()),
    path("sizes/<int:sizeId>/activate/", SizeActivateView.as_view()),
    path("sizes/<int:sizeId>/deactivate/", SizeDeactivateView.as_view()),
    path("categories/", CategoryView.as_view()),
    path("categories/<int:categoryId>/", CategoryDetailView.as_view()),
    path("categories/<int:categoryId>/activate/", CategoryActivateView.as_view()),
    path("categories/<int:categoryId>/deactivate/", CategoryDeactivateView.as_view()),
    path("colors/", ColorListCreateApi.as_view()),
    path("colors/<int:colorId>/", ColorDetailApi.as_view()),
    path("colors/<int:colorId>/activate/", ColorActivateApi.as_view()),
    path("colors/<int:colorId>/deactivate/", ColorDeactivateApi.as_view()),
    # MEMBER
    path("products/", ProductListCreateView.as_view()),
    path("products/<int:pk>/", ProductDetailView.as_view()),
    # SCHOOL
    path("school/products/", SchoolProductListCreateView.as_view()),
    path("school/products/<int:pk>/", SchoolProductDetailView.as_view()),
]
