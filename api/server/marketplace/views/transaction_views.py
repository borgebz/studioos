from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import paginated_response
from core.permissions import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES, paginated_list_schema
from marketplace import services
from marketplace.serializers import (
    TransactionDetailSerializer,
    TransactionRequestSerializer,
)


def _transaction_filters(request):
    q = request.query_params
    out = {}
    for key in ["status", "transaction_type"]:
        if q.get(key):
            out[key] = q.get(key)
    return out or None


class TransactionRequestView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TransactionRequestSerializer,
        responses={201: TransactionDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def post(self, request, listing_id):
        serializer = TransactionRequestSerializer(
            data={**request.data, "listing_id": listing_id}
        )
        serializer.is_valid(raise_exception=True)
        txn = services.request_transaction(
            user=request.user, **serializer.validated_data
        )
        return Response(
            TransactionDetailSerializer(txn).data, status=status.HTTP_201_CREATED
        )


class MyTransactionsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: paginated_list_schema(
                name="MyTransactionsList",
                results_serializer=TransactionDetailSerializer,
            ),
            **DEFAULT_ERROR_RESPONSES,
        }
    )
    @require_perm("marketplace.view_own_transactions")
    def get(self, request):
        txns = services.list_my_transactions(user=request.user)
        return paginated_response(
            request=request,
            items=txns,
            serializer_class=TransactionDetailSerializer,
        )


class TransactionDetailView(APIView):
    """Own-transaction detail — user must be requester or owner."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: TransactionDetailSerializer, **DEFAULT_ERROR_RESPONSES}
    )
    @require_perm("marketplace.view_own_transactions")
    def get(self, request, transaction_id):
        txn = services.get_my_transaction(
            transaction_id=transaction_id, user=request.user
        )
        return Response(TransactionDetailSerializer(txn).data)


class TransactionCancelView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: TransactionDetailSerializer, **DEFAULT_ERROR_RESPONSES}
    )
    def post(self, request, transaction_id):
        txn = services.cancel_transaction(
            transaction_id=transaction_id, user=request.user
        )
        return Response(TransactionDetailSerializer(txn).data)


class TransactionAcceptView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: TransactionDetailSerializer, **DEFAULT_ERROR_RESPONSES}
    )
    def post(self, request, transaction_id):
        txn = services.accept_transaction(
            transaction_id=transaction_id, user=request.user
        )
        return Response(TransactionDetailSerializer(txn).data)


class TransactionRejectView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: TransactionDetailSerializer, **DEFAULT_ERROR_RESPONSES}
    )
    def post(self, request, transaction_id):
        txn = services.reject_transaction(
            transaction_id=transaction_id, user=request.user
        )
        return Response(TransactionDetailSerializer(txn).data)


class TransactionCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: TransactionDetailSerializer, **DEFAULT_ERROR_RESPONSES}
    )
    def post(self, request, transaction_id):
        txn = services.complete_transaction(
            transaction_id=transaction_id, user=request.user
        )
        return Response(TransactionDetailSerializer(txn).data)


# ---------------------------------------------------------------------------
# School-scoped transaction views
# ---------------------------------------------------------------------------


class SchoolTransactionListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: paginated_list_schema(
                name="SchoolTransactionList",
                results_serializer=TransactionDetailSerializer,
            ),
            **DEFAULT_ERROR_RESPONSES,
        }
    )
    @require_perm("marketplace.manage_school_listings")
    def get(self, request):
        txns = services.list_transactions(
            filters=_transaction_filters(request)
        )
        return paginated_response(
            request=request,
            items=txns,
            serializer_class=TransactionDetailSerializer,
        )


class SchoolTransactionDetailView(APIView):
    """Admin/school detail — can view any transaction."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: TransactionDetailSerializer, **DEFAULT_ERROR_RESPONSES}
    )
    @require_perm("marketplace.view_all_transactions")
    def get(self, request, transaction_id):
        txn = services.get_transaction(transaction_id=transaction_id)
        return Response(TransactionDetailSerializer(txn).data)


class SchoolTransactionAcceptView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: TransactionDetailSerializer, **DEFAULT_ERROR_RESPONSES}
    )
    @require_perm("marketplace.manage_school_listings")
    def post(self, request, transaction_id):
        txn = services.accept_transaction(
            transaction_id=transaction_id, user=request.user
        )
        return Response(TransactionDetailSerializer(txn).data)


class SchoolTransactionRejectView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: TransactionDetailSerializer, **DEFAULT_ERROR_RESPONSES}
    )
    @require_perm("marketplace.manage_school_listings")
    def post(self, request, transaction_id):
        txn = services.reject_transaction(
            transaction_id=transaction_id, user=request.user
        )
        return Response(TransactionDetailSerializer(txn).data)


class SchoolTransactionCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: TransactionDetailSerializer, **DEFAULT_ERROR_RESPONSES}
    )
    @require_perm("marketplace.manage_school_listings")
    def post(self, request, transaction_id):
        txn = services.complete_transaction(
            transaction_id=transaction_id, user=request.user
        )
        return Response(TransactionDetailSerializer(txn).data)


class SchoolTransactionBlockView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: TransactionDetailSerializer, **DEFAULT_ERROR_RESPONSES}
    )
    @require_perm("marketplace.manage_school_listings")
    def post(self, request, transaction_id):
        txn = services.block_transaction(
            transaction_id=transaction_id, user=request.user
        )
        return Response(TransactionDetailSerializer(txn).data)


class SchoolTransactionUnblockView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: TransactionDetailSerializer, **DEFAULT_ERROR_RESPONSES}
    )
    @require_perm("marketplace.manage_school_listings")
    def post(self, request, transaction_id):
        txn = services.unblock_transaction(
            transaction_id=transaction_id, user=request.user
        )
        return Response(TransactionDetailSerializer(txn).data)
