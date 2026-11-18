from django.contrib import admin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'ticket', 'amount', 'status', 'transaction_id', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('transaction_id', 'ticket__id', 'ticket__user__email')
    readonly_fields = ('created_at',)