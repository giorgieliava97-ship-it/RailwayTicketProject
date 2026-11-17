from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, SavedPassenger


class SavedPassengerInline(admin.TabularInline):
    model = SavedPassenger
    extra = 0
    fields = ("first_name", "last_name", "personal_id", "birth_date", "created_at")
    readonly_fields = ("created_at",)


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    inlines = [SavedPassengerInline]

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


@admin.register(SavedPassenger)
class SavedPassengerAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "personal_id", "user", "birth_date", "created_at")
    search_fields = ("first_name", "last_name", "personal_id", "user__email")
    list_filter = ("created_at",)