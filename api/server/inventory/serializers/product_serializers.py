from rest_framework import serializers
from inventory.models import Product


class ProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "name",
            "description",
            "price",
        ]


class ProductUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "name",
            "description",
            "price",
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"
