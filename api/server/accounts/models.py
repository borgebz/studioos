from django.contrib.auth.models import AbstractUser, Group
from django.db import models
from accounts.managers import UserManager, AllUsersManager
from core.models import AuditMixin, BaseModel, SoftDeleteMixin
import uuid
from pathlib import Path

# Create your models here.


class Language(models.TextChoices):
    PT = "pt", "Português"
    EN = "en", "English"


class User(AuditMixin, SoftDeleteMixin, AbstractUser):
    """
    Custom user model. Email is the login identifier.
    Includes audit fields and soft delete.
    """

    # Remove username, use email
    username = None
    email = models.EmailField("email", unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    phone = models.CharField(max_length=20, blank=True)
    phone_country_code = models.CharField(max_length=5, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    internal_number = models.IntegerField(null=True, blank=True)
    nif = models.CharField(max_length=20, blank=True)
    nationality = models.CharField(max_length=100, blank=True)
    document_number = models.CharField(max_length=50, blank=True)
    document_expiry = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    postal_code = models.CharField(max_length=20, blank=True)

    language = models.CharField(
        max_length=5,
        choices=Language.choices,
        default=Language.PT,
    )

    # Guardian -> Student relationship
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
    )

    objects = UserManager()
    all_objects = AllUsersManager()

    class Meta:
        permissions = [
            ("can_teach", "Can be assigned teaching modalities"),
        ]

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()


class Role(BaseModel):
    """
    Wrapper around Django's Group.
    Adds code and description to manage roles.
    """

    group = models.OneToOneField(
        Group,
        on_delete=models.CASCADE,
        related_name="role",
    )
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField()

    class Meta:
        ordering = ["code"]


def profile_photo_path(instance, filename):
    ext = Path(filename).suffix.lower()
    return f"profiles/{uuid.uuid4()}{ext}"


class Profile(BaseModel):
    """
    Public profile for users.
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    display_name = models.CharField(max_length=200, blank=True)
    bio = models.TextField(blank=True)
    photo = models.ImageField(upload_to=profile_photo_path, null=True, blank=True)
    is_public = models.BooleanField(default=False)

    class Meta:
        permissions = [
            ("can_have_profile", "Can create and manage a profile"),
        ]
