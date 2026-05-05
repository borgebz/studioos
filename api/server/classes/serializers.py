from rest_framework import serializers

from accounts.serializers import UserResponseSerializer
from classes.models import Classe, ClasseMember


class ClasseSubmitSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")


class ClasseUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)


class ClasseMemberSubmitSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()


class ClasseMemberSerializer(serializers.ModelSerializer):
    student = UserResponseSerializer(read_only=True)

    class Meta:
        model = ClasseMember
        fields = ["id", "student", "created_at"]


class ClasseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classe
        fields = ["id", "name", "description", "created_at", "updated_at"]


class ClasseDetailSerializer(serializers.ModelSerializer):
    members = ClasseMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Classe
        fields = ["id", "name", "description", "created_at", "updated_at", "members"]
