from rest_framework.pagination import PageNumberPagination


class DefaultPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def paginated_response(*, request, items, serializer_class, many=True):
    """
    Paginate an iterable from a service and return DRF's paginated payload.

    Keeps list endpoints on APIView + services without repeating paginator wiring.
    """
    paginator = DefaultPageNumberPagination()
    page = paginator.paginate_queryset(items, request)
    data = serializer_class(page, many=many, context={"request": request}).data
    return paginator.get_paginated_response(data)
