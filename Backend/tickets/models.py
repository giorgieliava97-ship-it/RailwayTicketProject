from django.db import models
import unicodedata

from .route_utils import (
    build_full_route, find_segment_indices, segment_seconds,
    class_prices, prorated_price, full_class_prices,
)


def normalize_str(val):
    if not val:
        return ""
    return unicodedata.normalize('NFC', str(val)).strip()


class Station(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="სადგურის/ქალაქის სახელი")
    code = models.CharField(max_length=20, unique=True, verbose_name="სადგურის კოდი", help_text="მაგ: 4001, 4002")
    city = models.CharField(max_length=100, verbose_name="ქალაქი", null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

    class Meta:
        verbose_name = "სადგური"
        verbose_name_plural = "სადგურები"


class Train(models.Model):
    class Category(models.TextChoices):
        MAGISTRAL = 'MAGISTRAL', 'მაგისტრალური მატარებლები'
        SUBURBAN = 'SUBURBAN', 'საგარეუბნო მატარებლები'
        INTERNATIONAL = 'INTERNATIONAL', 'საერთაშორისო მატარებლები'

    train_number = models.CharField(max_length=50, unique=True, verbose_name="მატარებლის ნომერი", help_text="მაგ.: 802")
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.MAGISTRAL,
        verbose_name="მატარებლის კატეგორია"
    )
    wagons_count = models.PositiveIntegerField(verbose_name="ვაგონების რაოდენობა", default=4)
    floors_count = models.PositiveIntegerField(verbose_name="სართულების რაოდენობა", default=1)

    second_class_seats = models.PositiveIntegerField(verbose_name="II კლასის ადგილები", default=60)
    first_class_seats = models.PositiveIntegerField(verbose_name="I კლასის ადგილები", default=30)
    business_class_seats = models.PositiveIntegerField(verbose_name="ბიზნეს კლასის ადგილები", default=10)

    @property
    def total_seats(self):
        return self.second_class_seats + self.first_class_seats + self.business_class_seats

    def __str__(self):
        return f"მატარებელი №{self.train_number} ({self.get_category_display()})"

    class Meta:
        verbose_name = "მატარებელი"
        verbose_name_plural = "მატარებლები"


class Trip(models.Model):
    train = models.ForeignKey(Train, on_delete=models.CASCADE, verbose_name="მატარებელი", related_name="trips")
    departure_station = models.ForeignKey(Station, on_delete=models.CASCADE, verbose_name="გამგზავრების სადგური",
                                          related_name="departures")
    arrival_station = models.ForeignKey(Station, on_delete=models.CASCADE, verbose_name="ჩასვლის სადგური",
                                        related_name="arrivals")

    departure_time = models.DateTimeField(verbose_name="გამგზავრების დრო")
    arrival_time = models.DateTimeField(verbose_name="ჩასვლის დრო")

    base_price = models.DecimalField(max_digits=8, decimal_places=2, verbose_name="II კლასის საბაზისო ფასი ₾",
                                     default=35.00)

    stops = models.JSONField(default=list, blank=True, verbose_name="გაჩერებების სია")

    def get_full_route_with_datetimes(self):
        """აბრუნებს სრულ მარშრუტს aware datetime-ებით (stops-ის დრო ადგილობრივად იკითხება)."""
        return build_full_route(
            self.departure_time,
            self.arrival_time,
            self.departure_station.name if self.departure_station else "",
            self.arrival_station.name if self.arrival_station else "",
            self.stops,
        )

    def get_segment(self, dep_query=None, arr_query=None):
        """
        ერთიანი სეგმენტის გამოთვლა ძებნის, ფასის, ადგილების რუკისა და ბილეთის ვალიდაციისთვის.
        აბრუნებს dict-ს ან None-ს (თუ სადგურები/მიმართულება არ ემთხვევა მარშრუტს).
        """
        route = self.get_full_route_with_datetimes()
        idx = find_segment_indices(route, dep_query, arr_query)
        if idx is None:
            return None
        board_idx, leave_idx = idx
        seg_s, total_s = segment_seconds(route, board_idx, leave_idx)
        return {
            "route": route,
            "board": route[board_idx],
            "leave": route[leave_idx],
            "segment_seconds": seg_s,
            "total_seconds": total_s,
            "ratio": seg_s / total_s,
        }

    def prices_for_segment(self, segment):
        """{'SECOND': int, 'FIRST': int, 'BUSINESS': int} — პროპორციული ფასები."""
        return class_prices(self.base_price, segment["segment_seconds"], segment["total_seconds"])

    def price_for_segment(self, seat_class, segment):
        full = full_class_prices(self.base_price).get(seat_class, full_class_prices(self.base_price)['SECOND'])
        return prorated_price(full, segment["segment_seconds"], segment["total_seconds"])

    @property
    def total_stops(self):
        return len(self.stops) if isinstance(self.stops, list) else 0

    @property
    def route(self):
        return f"{self.departure_station.name} - {self.arrival_station.name}"

    def __str__(self):
        return f"{self.route} | {self.departure_time.strftime('%Y-%m-%d %H:%M')}"

    class Meta:
        verbose_name = "რეისი"
        verbose_name_plural = "რეისები"


class Ticket(models.Model):
    class TicketStatus(models.TextChoices):
        PENDING = 'PENDING', 'მოლოდინში'
        ACTIVE = 'ACTIVE', 'აქტიური'
        USED = 'USED', 'გამოყენებული'
        CANCELLED = 'CANCELLED', 'გაუქმებული'

    class SeatClass(models.TextChoices):
        SECOND = 'SECOND', 'II კლასი'
        FIRST = 'FIRST', 'I კლასი'
        BUSINESS = 'BUSINESS', 'ბიზნეს კლასი'

    user = models.ForeignKey('user.CustomUser', on_delete=models.CASCADE, verbose_name="მყიდველი", related_name="tickets")
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, verbose_name="რეისი", related_name="tickets")
    seat_number = models.PositiveIntegerField(verbose_name="ადგილის ნომერი")

    # 🟢 მგზავრის პერსონალური მონაცემები თითოეული ბილეთისთვის
    first_name = models.CharField(max_length=100, verbose_name="მგზავრის სახელი", default="")
    last_name = models.CharField(max_length=100, verbose_name="მგზავრის გვარი", default="")
    id_number = models.CharField(max_length=50, verbose_name="პირადი ნომერი", default="")
    birth_date = models.DateField(verbose_name="დაბადების თარიღი", null=True, blank=True)

    seat_class = models.CharField(
        max_length=20,
        choices=SeatClass.choices,
        default=SeatClass.SECOND,
        verbose_name="ვაგონის კლასი"
    )
    price = models.DecimalField(max_digits=8, decimal_places=2, verbose_name="ბილეთის ფასი ₾")

    board_station = models.CharField(max_length=100, verbose_name="ჩასხდომის სადგური", default="")
    leave_station = models.CharField(max_length=100, verbose_name="ჩამოსხდომის სადგური", default="")
    board_time = models.DateTimeField(verbose_name="ჩასხდომის დრო", null=True, blank=True)
    leave_time = models.DateTimeField(verbose_name="ჩამოსხდომის დრო", null=True, blank=True)

    purchase_date = models.DateTimeField(auto_now_add=True, verbose_name="ყიდვის თარიღი")
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="ჯავშნის ვადის გასვლის დრო")

    status = models.CharField(
        max_length=20,
        choices=TicketStatus.choices,
        default=TicketStatus.PENDING,
        verbose_name="ბილეთის სტატუსი"
    )

    def __str__(self):
        return f"ბილეთი №{self.id} - {self.first_name} {self.last_name} (ადგილი: {self.seat_number})"

    class Meta:
        verbose_name = "ბილეთი"
        verbose_name_plural = "ბილეთები"