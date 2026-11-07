
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):

    list_display = (
        "username",
        "email",
        "phone_number",
        "personal_id",
        "is_staff",
        "is_active",
    )

    list_filter = ("is_staff", "is_superuser", "is_active")

    search_fields = ("username", "email", "phone_number", "personal_id")

    fieldsets = UserAdmin.fieldsets + (
        (
            "დამატებითი ინფორმაცია",
            {"fields": ("phone_number", "personal_id")},
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "დამატებითი ინფორმაცია",
            {"fields": ("phone_number", "personal_id")},
        ),
    )