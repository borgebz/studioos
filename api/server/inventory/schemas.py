from drf_spectacular.utils import inline_serializer
from rest_framework import serializers


def inventory_paginated_schema(*, name, results_serializer):
    """OpenAPI shape for ``PageNumberPagination`` list responses."""
    return inline_serializer(
        name=name,
        fields={
            "count": serializers.IntegerField(),
            "next": serializers.URLField(allow_null=True, required=False),
            "previous": serializers.URLField(allow_null=True, required=False),
            "results": results_serializer(many=True),
        },
    )
