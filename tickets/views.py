from rest_framework.views import APIView
from rest_framework.response import Response
import uuid
from payments.models import Payment
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from .models import Station, Train, Trip, Ticket
from .serializers import (StationSerializer, TrainSerializer,
                          TripSerializer, TicketSerializer)

class StationViewSet(viewsets.ModelViewSet):
    queryset = Station.objects.all()
    serializer_class = StationSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class TrainViewSet(viewsets.ModelViewSet):
    queryset = Train.objects.all()
    serializer_class = TrainSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class TripViewSet(viewsets.ModelViewSet):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Ticket.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        ticket = serializer.save(user=self.request.user)
        Payment.objects.create(
            ticket=ticket,
            amount=ticket.trip.price,
            status=Payment.PaymentStatus.SUCCESS,
            transaction_id=str(uuid.uuid4())
        )


class TripSeatMapView(APIView):
    def get(self, request, trip_id):
        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"error": "რეისი ვერ მოიძებნა"}, status=404)

        booked_seats = Ticket.objects.filter(trip=trip).values_list('seat_number', flat=True)

        total_seats = trip.train.total_seats
        seats_status = []

        for seat in range(1, total_seats + 1):
            seats_status.append({
                "seat_number": seat,
                "is_booked": seat in booked_seats
            })

        return Response({
            "train": trip.train.train_number,
            "total_seats": total_seats,
            "seats": seats_status
        })
