# Create your views here.
from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from .models import Studio, Modality
from .serializers import StudioSerializer, ModalitySerializer
from . import services


class StudioListCreateView(generics.ListCreateAPIView):
    queryset = Studio.objects.all()
    serializer_class = StudioSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        studio = services.create_studio(serializer.validated_data)
        return Response(StudioSerializer(studio).data, status=status.HTTP_201_CREATED)


class StudioRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Studio.objects.all()
    serializer_class = StudioSerializer


class ModalityListCreateView(generics.ListCreateAPIView):
    queryset = Modality.objects.all()
    serializer_class = ModalitySerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        modality = services.create_modality(serializer.validated_data)
        return Response(
            ModalitySerializer(modality).data, status=status.HTTP_201_CREATED
        )


class ModalityRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Modality.objects.all()
    serializer_class = ModalitySerializer
