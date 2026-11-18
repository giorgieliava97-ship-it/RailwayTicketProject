from django.contrib import admin
from .models import InfoPage

@admin.register(InfoPage)
class InfoPageAdmin(admin.ModelAdmin):
    list_display = ('id', 'title')
    search_fields = ('title',)