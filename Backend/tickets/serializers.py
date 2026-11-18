from rest_framework import serializers
from .models import Station, Train, Trip, Ticket
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from .route_utils import normalize_station_name  # noqa: F401  (თავსებადობისთვის)


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
    available_seats = serializers.SerializerMethodField()        #  აბრუნებს მთელ რიცხვს (ჯამს)
    class_available_seats = serializers.SerializerMethodField() #  აბრუნებს ობიექტს კლასების მიხედვით

    route = serializers.CharField(read_only=True)
    total_stops = serializers.IntegerField(read_only=True)
    stops = serializers.JSONField(read_only=True)
    prices = serializers.SerializerMethodField()
    segment = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = ['id', 'train', 'departure_station', 'arrival_station',
                  'departure_time', 'arrival_time', 'base_price', 'available_seats',
                  'class_available_seats', 'route', 'total_stops', 'stops', 'prices', 'segment']

    def _get_queries(self):
        request = self.context.get('request')
        if request is None:
            return '', ''
        params = getattr(request, 'query_params', None)
        if params is None:
            params = getattr(request, 'GET', {})
        return params.get('departure_station') or '', params.get('arrival_station') or ''

    def _segment(self, obj):
        cached = getattr(obj, '_segment_cache', None)
        if cached is not None:
            return cached
        dep_query, arr_query = self._get_queries()
        segment = obj.get_segment(dep_query, arr_query) or obj.get_segment('', '')
        obj._segment_cache = segment
        return segment

    def _calculate_booked_counts(self, obj):
        seg = self._segment(obj)
        now = timezone.now()
        tickets_qs = Ticket.objects.filter(trip=obj).filter(
            Q(status__in=[Ticket.TicketStatus.ACTIVE, Ticket.TicketStatus.USED]) |
            Q(status=Ticket.TicketStatus.PENDING, expires_at__gt=now)
        ).filter(
            board_time__lt=seg['leave']['time'],
            leave_time__gt=seg['board']['time'],
        )

        #  ვქმნით სტრუქტურას, რომელიც თითოეული კლასისთვის შეინახავს დაკავებული ადგილების უნიკალურ ნომრებს (სეტებს)
        booked_seats_by_class = {}
        for t in tickets_qs:
            s_class = t.seat_class.upper()
            if s_class not in booked_seats_by_class:
                booked_seats_by_class[s_class] = set()
            booked_seats_by_class[s_class].add(t.seat_number)

        #  ვაბრუნებთ თითოეული კლასისთვის დაკავებული უნიკალური ადგილების რაოდენობას
        return {s_class: len(seats) for s_class, seats in booked_seats_by_class.items()}

    def get_class_available_seats(self, obj):
        train = obj.train
        booked_counts = self._calculate_booked_counts(obj)
        return {
            'SECOND': max(0, train.second_class_seats - booked_counts.get('SECOND', 0)),
            'FIRST': max(0, train.first_class_seats - booked_counts.get('FIRST', 0)),
            'BUSINESS': max(0, train.business_class_seats - booked_counts.get('BUSINESS', 0)),
        }

    def get_available_seats(self, obj):
        # აბრუნებს მთლიან ჯამურ რიცხვს, რომ მთავარზე ერორი არ აგდოს
        classes = self.get_class_available_seats(obj)
        return sum(classes.values())

    def get_prices(self, obj):
        return obj.prices_for_segment(self._segment(obj))

    def get_segment(self, obj):
        seg = self._segment(obj)
        local = timezone.localtime
        return {
            'board_station': seg['board']['station'],
            'leave_station': seg['leave']['station'],
            'board_time': local(seg['board']['time']).strftime('%H:%M') if timezone.is_aware(seg['board']['time']) else seg['board']['time'].strftime('%H:%M'),
            'leave_time': local(seg['leave']['time']).strftime('%H:%M') if timezone.is_aware(seg['leave']['time']) else seg['leave']['time'].strftime('%H:%M'),
            'duration_minutes': seg['segment_seconds'] // 60,
            'ratio': round(seg['ratio'], 4),
        }


class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = [
            'id', 'trip', 'seat_number', 'seat_class', 'price',
            'board_station', 'leave_station', 'board_time', 'leave_time',
            'status', 'first_name', 'last_name', 'id_number', 'birth_date'
        ]

    def validate(self, attrs):
        trip = attrs.get('trip')
        seat_number = attrs.get('seat_number')
        seat_class = attrs.get('seat_class') or Ticket.SeatClass.SECOND
        board_station_name = attrs.get('board_station')
        leave_station_name = attrs.get('leave_station')
        id_number = attrs.get('id_number')
        now = timezone.now()

        if not board_station_name or not leave_station_name:
            raise serializers.ValidationError({"non_field_errors": "არასწორი ჩასხდომის ან ჩამოსხდომის სადგური."})

        segment = trip.get_segment(board_station_name, leave_station_name)
        if segment is None:
            raise serializers.ValidationError(
                {"non_field_errors": "არასწორი ჩასხდომის ან ჩამოსხდომის სადგური, ან მიმართულება."})

        board_time = segment['board']['time']
        leave_time = segment['leave']['time']

        if board_time >= leave_time:
            raise serializers.ValidationError({"non_field_errors": "ჩასხდომის დრო უნდა უსწრებდეს ჩამოსხდომის დროს."})

        attrs['board_time'] = board_time
        attrs['leave_time'] = leave_time

        # 1. ადგილის დაკავებულობის შემოწმება
        overlapping_tickets = Ticket.objects.filter(
            trip=trip,
            seat_number=seat_number
        ).filter(
            Q(status__in=[Ticket.TicketStatus.ACTIVE, Ticket.TicketStatus.USED]) |
            Q(status=Ticket.TicketStatus.PENDING, expires_at__gt=now)
        ).filter(
            board_time__lt=leave_time,
            leave_time__gt=board_time
        )

        if overlapping_tickets.exists():
            raise serializers.ValidationError({"seat_number": "ეს ადგილი არჩეულ მონაკვეთზე უკვე დაკავებულია."})

        #  2. მკაცრი შემოწმება: ხომ არ აქვს ამ მგზავრს (პირადი ნომრით) უკვე აქტიური ბილეთი ამ რეისზე
        if id_number:
            existing_passenger_ticket = Ticket.objects.filter(trip=trip, id_number=id_number).filter(
                Q(status__in=[Ticket.TicketStatus.ACTIVE, Ticket.TicketStatus.USED]) |
                Q(status=Ticket.TicketStatus.PENDING, expires_at__gt=now)
            ).filter(
                board_time__lt=leave_time,
                leave_time__gt=board_time
            )

            if existing_passenger_ticket.exists():
                raise serializers.ValidationError({
                    "id_number": f"მგზავრი პირადი ნომრით ({id_number}) უკვე ფლობს ბილეთს ამ რეისზე!"
                })

        attrs['price'] = trip.price_for_segment(seat_class, segment)
        return attrs

    def create(self, validated_data):
        validated_data['status'] = Ticket.TicketStatus.PENDING
        validated_data['expires_at'] = timezone.now() + timedelta(minutes=10)
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
