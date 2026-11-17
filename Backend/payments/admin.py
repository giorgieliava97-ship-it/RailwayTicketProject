from django.contrib.admin import register
from django.contrib import admin
from .models import Payment

admin.site.register(Payment)