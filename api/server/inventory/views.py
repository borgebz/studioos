from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from django.db.models import Exists, OuterRef

from .models import SizeSystem, Category, ProductVariant
from .serializers import SizeSystemSerializer


class SizeSystemViewSet(viewsets.ModelViewSet):
    queryset = SizeSystem.objects.all().order_by("name")
    serializer_class = SizeSystemSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # 🔥 Verificar se está a ser usado por ProductVariant via Category
        has_products = ProductVariant.objects.filter(
            product__category__size_system=instance
        ).exists()

        if has_products:
            return Response(
                {"detail": "SizeSystemHasAssociatedProducts"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Se só existir Category → limpar FK
        Category.objects.filter(size_system=instance).update(size_system=None)

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        instance = self.get_object()
        instance.is_active = True
        instance.save()

        return Response({"status": "activated"})

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        instance = self.get_object()
        instance.is_active = False
        instance.save()

        return Response({"status": "deactivated"})
