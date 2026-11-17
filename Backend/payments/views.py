from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Payment
from .serializers import PaymentSerializer
from tickets.models import Ticket
from django.utils import timezone

class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(ticket__user=self.request.user)

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        payment = self.get_object()
        ticket = payment.ticket
        now = timezone.now()

        if payment.status == Payment.PaymentStatus.SUCCESS:
            return Response(
                {"detail": "ეს გადახდა უკვე წარმატებით არის შესრულებული."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if payment.status == Payment.PaymentStatus.FAILED:
            return Response(
                {"detail": "ეს გადახდა წარუმატებელია და მისი გააქტიურება შეუძლებელია."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if ticket.status == Ticket.TicketStatus.PENDING and ticket.expires_at and ticket.expires_at < now:
            return Response(
                {"detail": "დროებითი ჯავშნის ვადა (10 წუთი) გასულია. ბილეთი გაუქმებულია."},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment.status = Payment.PaymentStatus.SUCCESS
        payment.save()

        ticket = payment.ticket
        ticket.status = Ticket.TicketStatus.ACTIVE
        ticket.expires_at = None
        ticket.save()

        return Response({
            "detail": "გადახდა წარმატებით დასრულდა! ბილეთი გააქტიურდა.",
            "payment": PaymentSerializer(payment).data
        }, status=status.HTTP_200_OK)