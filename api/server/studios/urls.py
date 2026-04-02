from django.urls import path
from . import views

urlpatterns = [
    path('studios/', views.StudioListCreateView.as_view(), name='studio-list-create'),
    path('studios/<int:pk>/', views.StudioRetrieveUpdateDestroyView.as_view(), name='studio-detail'),
    
    path('modalities/', views.ModalityListCreateView.as_view(), name='modality-list-create'),
    path('modalities/<int:pk>/', views.ModalityRetrieveUpdateDestroyView.as_view(), name='modality-detail'),
]