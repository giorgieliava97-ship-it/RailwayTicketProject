from rest_framework import serializers
from .models import Payment
from tickets.serializers import TicketSerializer

class PaymentSerializer(serializers.ModelSerializer):
    ticket_details = TicketSerializer(source='ticket', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'ticket', 'ticket_details', 'amount', 'status',
                  'status_display', 'transaction_id', 'created_at']
        read_only_fields = ['status', 'transaction_id', 'created_at']
