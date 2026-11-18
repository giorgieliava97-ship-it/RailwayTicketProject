from rest_framework.views import APIView
from rest_framework.response import Response
import uuid
from payments.models import Payment
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, AllowAny
from .models import Station, Train, Trip, Ticket
from .serializers import (StationSerializer, TrainSerializer,
                          TripSerializer, TicketSerializer)
from django.utils import timezone
from django.utils.timezone import localtime
from django.db.models import Q
from datetime import timedelta
from .route_utils import normalize_station_name, find_segment_indices  # noqa: F401
from .wagon_utils import generate_wagon_layout
from rest_framework.decorators import api_view, permission_classes, action
import random



def _hhmm(dt):
    if dt is None:
        return ""
    if timezone.is_aware(dt):
        dt = localtime(dt)
    return dt.strftime('%H:%M')


def filter_trips_by_stations(queryset, dep_query, arr_query):
    """
    ტოვებს მხოლოდ იმ რეისებს, რომლებზეც მოთხოვნილი სეგმენტი არსებობს.
    იყენებს იგივე Trip.get_segment ლოგიკას, რასაც ფასი და ბილეთის ვალიდაცია.
    """
    matched_results = []

    for trip in queryset.select_related('train', 'departure_station', 'arrival_station'):
        segment = trip.get_segment(dep_query, arr_query)
        if segment is None:
            continue

        full_route = [{'station': r['station'], 'time': _hhmm(r['time'])} for r in segment['route']]
        board_idx = next(i for i, r in enumerate(segment['route']) if r is segment['board'])
        leave_idx = next(i for i, r in enumerate(segment['route']) if r is segment['leave'])

        matched_results.append({
            "trip": trip,
            "effective_dep": full_route[board_idx],
            "effective_arr": full_route[leave_idx],
            "full_route": full_route,
        })

    return matched_results


class StationViewSet(viewsets.ModelViewSet):
    queryset = Station.objects.all()
    serializer_class = StationSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = None  #  უზრუნველყოფს, რომ სადგურების სია ფრონტენდმა სწორად მიიღოს


class TrainViewSet(viewsets.ModelViewSet):
    queryset = Train.objects.all()
    serializer_class = TrainSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class TripViewSet(viewsets.ModelViewSet):
    queryset = Trip.objects.select_related('train', 'departure_station', 'arrival_station')
    serializer_class = TripSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        now = timezone.now()
        queryset = super().get_queryset().filter(departure_time__gte=now)

        dep_query = self.request.query_params.get('departure_station', None)
        arr_query = self.request.query_params.get('arrival_station', None)
        date_query = self.request.query_params.get('date', None)

        if date_query and date_query.strip() and date_query != 'null' and date_query != 'undefined':
            queryset = queryset.filter(departure_time__date=date_query)

        if dep_query or arr_query:
            matched = filter_trips_by_stations(queryset, dep_query, arr_query)
            valid_ids = [item["trip"].id for item in matched]
            queryset = queryset.filter(id__in=valid_ids)

        return queryset


class ScheduleAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        dep_query = request.query_params.get('departure_station', '')
        arr_query = request.query_params.get('arrival_station', '')

        queryset = Trip.objects.all()
        matched = filter_trips_by_stations(queryset, dep_query, arr_query)

        matched_trips = []
        for item in matched:
            trip = item["trip"]

            original_dep_name = trip.departure_station.name if trip.departure_station else ""
            original_arr_name = trip.arrival_station.name if trip.arrival_station else ""

            local_dep = localtime(trip.departure_time) if trip.departure_time else None
            local_arr = localtime(trip.arrival_time) if trip.arrival_time else None

            original_dep_time = local_dep.strftime('%H:%M') if local_dep else ""
            original_arr_time = local_arr.strftime('%H:%M') if local_arr else ""

            trip_data = {
                "id": trip.id,
                "train_number": trip.train.train_number if trip.train else "",
                "category": trip.train.category if trip.train else "MAGISTRAL",
                "route": f"{original_dep_name} – {original_arr_name}",
                "departure_station": original_dep_name,
                "arrival_station": original_arr_name,
                "departure_time": original_dep_time,
                "arrival_time": original_arr_time,
                "stops": item["full_route"]
            }
            matched_trips.append(trip_data)

        unique_map = {}
        for t in matched_trips:
            key = f"{t['train_number']}_{t['departure_time']}"
            if key not in unique_map:
                unique_map[key] = t

        return Response(list(unique_map.values()), status=200)


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Ticket.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        now = timezone.now()
        expire_time = now + timedelta(minutes=10)

        ticket = serializer.save(
            user=self.request.user,
            status=Ticket.TicketStatus.PENDING,
            expires_at=expire_time
        )

        Payment.objects.create(
            ticket=ticket,
            amount=ticket.price,
            status=Payment.PaymentStatus.PENDING,
            transaction_id=str(uuid.uuid4())
        )

#  ბილეთის დაბრუნების / გაუქმების ენდპოინტი
    @action(detail=True, methods=['post'])
    def return_ticket(self, request, pk=None):
        ticket = self.get_object()

        # შევამოწმოთ, რომ ბილეთი რეალურად აქტიურია
        if ticket.status != Ticket.TicketStatus.ACTIVE:
            return Response(
                {"error": "მხოლოდ აქტიური ბილეთის დაბრუნებაა შესაძლებელი."},
                status=400
            )

        # ვცვლით სტატუსს CANCELLED-ზე (რაც ავტომატურად ათავისუფლებს ადგილს)
        ticket.status = Ticket.TicketStatus.CANCELLED
        ticket.save()

        # თუ დაკავშირებული გადახდაც აქვს, მის სტატუსსაც ვცვლით
        try:
            if hasattr(ticket, 'payment') and ticket.payment:
                ticket.payment.status = 'CANCELLED'
                ticket.payment.save()
        except Exception:
            pass

        return Response({
            "success": True,
            "message": f"ბილეთი TKT-{ticket.id} წარმატებით დაბრუნდა და ადგილი გათავისუფლდა."
        }, status=200)


class TripSeatMapView(APIView):
    def get(self, request, trip_id):
        try:
            trip = Trip.objects.select_related('train', 'departure_station', 'arrival_station').get(id=trip_id)
        except Trip.DoesNotExist:
            return Response({"error": "რეისი ვერ მოიძებნა"}, status=404)

        board_station_name = request.query_params.get('board_station')
        leave_station_name = request.query_params.get('leave_station')

        try:
            wagon_number = int(request.query_params.get('wagon', 1))
        except (ValueError, TypeError):
            wagon_number = 1

        # 1. ვპოულობთ ამ რეისზე უკვე დაკავებულ ბილეთებს შესაბამის სეგმენტზე
        now = timezone.now()
        tickets_qs = Ticket.objects.filter(trip=trip).filter(
            Q(status__in=[Ticket.TicketStatus.ACTIVE, Ticket.TicketStatus.USED]) |
            Q(status=Ticket.TicketStatus.PENDING, expires_at__gt=now)
        )

        if board_station_name and leave_station_name:
            segment = trip.get_segment(board_station_name, leave_station_name)
            if segment is None:
                return Response({"error": "არასწორი ჩასხდომის ან ჩამოსხდომის სადგური"}, status=400)

            tickets_qs = tickets_qs.filter(
                board_time__lt=segment['leave']['time'],
                leave_time__gt=segment['board']['time'],
            )

        booked_seats = set(tickets_qs.values_list('seat_number', flat=True))

        # 2. ვგენერირებთ ვაგონის მატრიცას wagon_utils-ის დახმარებით
        wagon_data = generate_wagon_layout(trip.train, wagon_number=wagon_number, booked_seats=booked_seats)

        # ვაბრუნებთ პირდაპირ wagon_data-ს
        return Response(wagon_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auto_assign_seats(request, trip_id):
    try:
        trip = Trip.objects.select_related('train').get(id=trip_id)
    except Trip.DoesNotExist:
        return Response({"error": "რეისი ვერ მოიძებნა"}, status=404)

    seat_class = request.data.get('seat_class', 'SECOND').upper()
    quantity = int(request.data.get('quantity', 1))
    board_station_name = request.data.get('board_station')
    leave_station_name = request.data.get('leave_station')

    if quantity < 1 or quantity > 9:
        return Response({"error": "ბილეთების რაოდენობა უნდა იყოს 1-დან 9-მდე"}, status=400)

    now = timezone.now()
    tickets_qs = Ticket.objects.filter(trip=trip).filter(
        Q(status__in=[Ticket.TicketStatus.ACTIVE, Ticket.TicketStatus.USED]) |
        Q(status=Ticket.TicketStatus.PENDING, expires_at__gt=now)
    )

    if board_station_name and leave_station_name:
        segment = trip.get_segment(board_station_name, leave_station_name)
        if segment is None:
            return Response({"error": "არასწორი სადგურები"}, status=400)
        tickets_qs = tickets_qs.filter(
            board_time__lt=segment['leave']['time'],
            leave_time__gt=segment['board']['time'],
        )
    else:
        segment = trip.get_segment('', '')

    booked_seats = set(tickets_qs.values_list('seat_number', flat=True))

    available_seats_pool = []
    total_wagons = trip.train.wagons_count

    for w_num in range(1, total_wagons + 1):
        wagon_data = generate_wagon_layout(trip.train, wagon_number=w_num, booked_seats=booked_seats)
        floors = wagon_data.get("layout", {}).get("floors", [])

        for floor in floors:
            for row in floor.get("rows", []):
                for cell in row:
                    if isinstance(cell, dict) and cell.get("type") == "seat":
                        if cell.get("class", "").upper() == seat_class and cell.get("status") == "available":
                            if cell["number"] not in booked_seats:
                                available_seats_pool.append({
                                    "seat_number": cell["number"],
                                    "seat_class": seat_class
                                })

    if len(available_seats_pool) < quantity:
        return Response(
            {"error": f"არ არის საკმარისი თავისუფალი ადგილები ამ კლასში. ხელმისაწვდომია: {len(available_seats_pool)}"},
            status=400)

    selected_seats = random.sample(available_seats_pool, quantity)

    assigned_seat_info = []
    for seat in selected_seats:
        price = trip.price_for_segment(seat_class, segment)
        assigned_seat_info.append({
            "seat_number": seat["seat_number"],
            "price": float(price)
        })

    return Response({
        "success": True,
        "assigned_seats": assigned_seat_info,
        "message": f"წარმატებით გამოიყო {quantity} ადგილი."
    }, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def book_manual_seats(request, trip_id):
    try:
        trip = Trip.objects.select_related('train').get(id=trip_id)
    except Trip.DoesNotExist:
        return Response({"error": "რეისი ვერ მოიძებნა"}, status=404)

    seat_class = request.data.get('seat_class', 'SECOND').upper()
    passengers = request.data.get('passengers', [])
    board_station_name = request.data.get('board_station')
    leave_station_name = request.data.get('leave_station')

    if not passengers:
        return Response({"error": "მგზავრების მონაცემები არ არის მითითებული"}, status=400)

    now = timezone.now()
    if board_station_name and leave_station_name:
        segment = trip.get_segment(board_station_name, leave_station_name)
        if segment is None:
            return Response({"error": "არასწორი სადგურები"}, status=400)
    else:
        segment = trip.get_segment('', '')

    board_time = segment['board']['time']
    leave_time = segment['leave']['time']

    # 1. შემოწმება: ხომ არ მეორდება პირადი ნომრები მოთხოვნილ სიაში
    submitted_ids = [p.get('idNumber') for p in passengers if p.get('idNumber')]
    if len(submitted_ids) != len(set(submitted_ids)):
        return Response({"error": "სიაში მითითებულია ერთი და იგივე პირადი ნომერი რამდენჯერმე."}, status=400)

    # 2. შემოწმება: ხომ არ აქვს მგზავრს უკვე ბილეთი ამ რეისზე
    for p in passengers:
        p_id = p.get('idNumber')
        if p_id:
            already_has = Ticket.objects.filter(trip=trip, id_number=p_id).filter(
                Q(status__in=[Ticket.TicketStatus.ACTIVE, Ticket.TicketStatus.USED]) |
                Q(status=Ticket.TicketStatus.PENDING, expires_at__gt=now)
            ).filter(
                board_time__lt=leave_time,
                leave_time__gt=board_time
            ).exists()

            if already_has:
                return Response({
                    "success": False,
                    "error": f"მგზავრი პირადი ნომრით ({p_id}) უკვე ფლობს ბილეთს ამ რეისზე!"
                }, status=400)

        #  3. შემოწმება: ხომ არ არის თავად ადგილი დაკავებული ამ სეგმენტზე
        seat_num = int(p.get('seatNumber'))
        seat_occupied = Ticket.objects.filter(
            trip=trip,
            seat_number=seat_num
        ).filter(
            Q(status__in=[Ticket.TicketStatus.ACTIVE, Ticket.TicketStatus.USED]) |
            Q(status=Ticket.TicketStatus.PENDING, expires_at__gt=now)
        ).filter(
            board_time__lt=leave_time,
            leave_time__gt=board_time
        ).exists()

        if seat_occupied:
            return Response({
                "success": False,
                "error": f"ადგილი #{seat_num} არჩეულ მონაკვეთზე უკვე დაკავებულია!"
            }, status=400)

    expire_time = now + timedelta(minutes=10)

    for p in passengers:
        seat_num = int(p.get('seatNumber'))
        price = trip.price_for_segment(seat_class, segment)

        ticket = Ticket.objects.create(
            user=request.user,
            trip=trip,
            seat_number=seat_num,
            first_name=p.get('firstName', ''),
            last_name=p.get('lastName', ''),
            id_number=p.get('idNumber', ''),
            birth_date=p.get('birthDate') or None,
            seat_class=seat_class,
            price=price,
            board_station=segment['board']['station'],
            leave_station=segment['leave']['station'],
            board_time=board_time,
            leave_time=leave_time,
            status=Ticket.TicketStatus.PENDING,
            expires_at=expire_time
        )
        Payment.objects.create(
            ticket=ticket,
            amount=ticket.price,
            status=Payment.PaymentStatus.PENDING,
            transaction_id=str(uuid.uuid4())
        )

    return Response({
        "success": True,
        "message": f"წარმატებით შეიქმნა {len(passengers)} ბილეთი."
    }, status=201)