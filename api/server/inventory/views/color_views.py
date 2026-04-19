from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from inventory.services import color_services as services
from inventory.serializers.color_serializers import ColorSerializer
from core.permissions import require_perm


class ColorListCreateApi(APIView):

    @require_perm("inventory.view_color")
    def get(self, request):
        colors = services.list_colors(is_active=request.query_params.get("is_active"))
        return Response(ColorSerializer(colors, many=True).data)

    @require_perm("inventory.add_color")
    def post(self, request):
        serializer = ColorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        color = services.create_color(**serializer.validated_data)
        return Response(ColorSerializer(color).data, status=status.HTTP_201_CREATED)


class ColorDetailApi(APIView):

    @require_perm("inventory.delete_color")
    def delete(self, request, colorId):
        color = services.get_color(pk=colorId)
        services.delete_color(color=color)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ColorActivateApi(APIView):

    @require_perm("inventory.change_color")
    def post(self, request, colorId):
        color = services.get_color(pk=colorId)
        color = services.activate_color(color=color)
        return Response(ColorSerializer(color).data)


class ColorDeactivateApi(APIView):

    @require_perm("inventory.change_color")
    def post(self, request, colorId):
        color = services.get_color(pk=colorId)
        color = services.deactivate_color(color=color)
        return Response(ColorSerializer(color).data)
