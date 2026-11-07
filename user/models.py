from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    phone_number = models.CharField(max_length=20, unique=True, verbose_name="ტელეფონის ნომერი", null=True, blank=True)
    personal_id = models.CharField(max_length=11, unique=True, verbose_name="პირადი ნომერი", null=True, blank=True)
    date_of_birth = models.DateField(verbose_name="დაბადების თარიღი", null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.first_name} {self.last_name})"

    class Meta:
        verbose_name = "მომხმარებელი"
        verbose_name_plural = "მომხმარებლები"