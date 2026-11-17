from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    GENDER_CHOICES = (
        ('male', 'მამრობითი'),
        ('female', 'მდედრობითი'),
    )
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True, verbose_name="ელ-ფოსტა", null=False, blank=False)
    phone_number = models.CharField(max_length=20, unique=True, verbose_name="ტელეფონის ნომერი",
                                    null=False, blank=False)
    personal_id = models.CharField(max_length=20, unique=True, verbose_name="პირადი/პასპორტის ნომერი",
                                   null=False, blank=False)
    first_name = models.CharField(max_length=150, null=False, blank=False, verbose_name="სახელი")
    last_name = models.CharField(max_length=150, null=False, blank=False, verbose_name="გვარი")
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=False, blank=False, verbose_name="სქესი")
    nationality = models.CharField(max_length=100, null=False, blank=False, verbose_name="მოქალაქეობა")
    date_of_birth = models.DateField(verbose_name="დაბადების თარიღი", null=True, blank=True)

    is_active = models.BooleanField(default=False, verbose_name="აქტიურია")

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return f"{self.email} ({self.first_name} {self.last_name})"

    class Meta:
        verbose_name = "მომხმარებელი"
        verbose_name_plural = "მომხმარებლები"

class SavedPassenger(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='saved_passengers')
    first_name = models.CharField(max_length=150, verbose_name="სახელი")
    last_name = models.CharField(max_length=150, verbose_name="გვარი")
    personal_id = models.CharField(max_length=50, verbose_name="პირადი/პასპორტის ნომერი")
    birth_date = models.DateField(null=True, blank=True, verbose_name="დაბადების თარიღი")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="დამატების თარიღი")

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.personal_id})"

    class Meta:
        verbose_name = "დამახსოვრებული მგზავრი"
        verbose_name_plural = "დამახსოვრებული მგზავრები"