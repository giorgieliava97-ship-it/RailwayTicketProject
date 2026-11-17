from django.contrib import admin
from .models import Station, Train, Trip, Ticket

admin.site.register(Station)
admin.site.register(Train)
admin.site.register(Trip)
admin.site.register(Ticket)