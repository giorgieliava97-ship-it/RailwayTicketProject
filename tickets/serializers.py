from rest_framework import serializers
from .models import Station, Train, Trip, Ticket
from django.db.models import Q
from django.utils import timezone

class StationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Station
        fields = '__all__'

class TrainSerializer(serializers.ModelSerializer):
    class Meta:
        model = Train
        fields = '__all__'

class TripSerializer(serializers.ModelSerializer):
    train = TrainSerializer(read_only=True)
    departure_station = StationSerializer(read_only=True)
    arrival_station = StationSerializer(read_only=True)
    available_seats = serializers.IntegerField(read_only=True)

    class Meta:
        model = Trip
        fields = ['id', 'train', 'departure_station', 'arrival_station',
                  'departure_time', 'arrival_time', 'price', 'available_seats']

class TicketSerializer(serializers.ModelSerializer):
    trip_details = TripSerializer(source='trip', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Ticket
        fields = ['id', 'user', 'trip', 'trip_details',
                  'seat_number', 'purchase_date', 'status',
                  'status_display', 'expires_at']
        read_only_fields = ['user', 'purchase_date', 'status', 'expires_at']

    def validate(self, attrs):
        trip = attrs.get('trip')
        seat_number = attrs.get('seat_number')
        user = self.context['request'].user
        now = timezone.now()

        active_or_valid_pending = Ticket.objects.filter(trip=trip, seat_number=seat_number).filter(
            Q(status__in=[Ticket.TicketStatus.ACTIVE, Ticket.TicketStatus.USED]) |
            Q(status=Ticket.TicketStatus.PENDING, expires_at__gt=now)
        )
        if active_or_valid_pending.exists():
            raise serializers.ValidationError({"seat_number": "ეს ადგილი უკვე დაკავებულია ან დროებით ჯავშანშია სხვისი მხრიდან."})

        if seat_number > trip.train.total_seats or seat_number < 1:
            raise serializers.ValidationError({
                "seat_number": f"არასწორი ადგილი. მატარებელს სულ აქვს {trip.train.total_seats} ადგილი."
            })

        user_active_tickets_count = Ticket.objects.filter(trip=trip, user=user).filter(
            Q(status__in=[Ticket.TicketStatus.ACTIVE, Ticket.TicketStatus.USED]) |
            Q(status=Ticket.TicketStatus.PENDING, expires_at__gt=now)
        ).count()

        if user_active_tickets_count >= 9:
            raise serializers.ValidationError({
                "non_field_errors": "თქვენ შეგიძლიათ იქონიოთ მაქსიმუმ 9 აქტიური ბილეთი ან დროებითი ჯავშანი ერთ რეისზე."
            })

        return attrs