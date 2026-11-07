from rest_framework import serializers
from .models import Station, Train, Trip, Ticket

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

    class Meta:
        model = Trip
        fields = '__all__'

class TicketSerializer(serializers.ModelSerializer):
    trip_details = TripSerializer(source='trip', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Ticket
        fields = ['id', 'user', 'trip', 'trip_details', 'seat_number', 'purchase_date', 'status', 'status_display']
        read_only_fields = ['user', 'purchase_date', 'status']

