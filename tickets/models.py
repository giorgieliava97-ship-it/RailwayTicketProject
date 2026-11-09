from django.db import models
from django.utils import timezone
from django.db.models import Q

import tickets


class Station(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="სადგურის/ქალაქის სახელი")
    code = models.CharField(max_length=20, unique=True, verbose_name="სადგურის კოდი", help_text="მაგ: TBS, BTM")
    city = models.CharField(max_length=100, verbose_name="ქალაქი", null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

    class Meta:
        verbose_name = "სადგური"
        verbose_name_plural = "სადგურები"


class Train(models.Model):
    train_number = models.CharField(max_length=50, unique=True, verbose_name="მატარებლის ნომერი", help_text="მაგ.: 802")
    train_type = models.CharField(max_length=50, verbose_name="მატარებლის ტიპი", default="ჩქაროსნული", help_text="მაგ.: მუნიციპალური, ჩქაროსნული")
    total_seats = models.PositiveIntegerField(verbose_name="ადგილების საერთო რაოდენობა", default=100)

    def __str__(self):
        return f"მატარებელი №{self.train_number} ({self.train_type})"

    class Meta:
        verbose_name = "მატარებელი"
        verbose_name_plural = "მატარებლები"

class Trip(models.Model):
    train = models.ForeignKey(Train, on_delete=models.CASCADE, verbose_name="მატარებელი", related_name="trips")
    departure_station = models.ForeignKey(Station, on_delete=models.CASCADE, verbose_name="გამგზავრების სადგური", related_name="departures")
    arrival_station = models.ForeignKey(Station, on_delete=models.CASCADE, verbose_name="ჩასვლის სადგური", related_name="arrivals")

    departure_time = models.DateTimeField(verbose_name="გამგზავრების დრო")
    arrival_time = models.DateTimeField(verbose_name="ჩასვლის დრო")

    price = models.DecimalField(max_digits=8, decimal_places=2, verbose_name="ბილეთის ფასი ₾")
    # available_seats = models.PositiveIntegerField(verbose_name="თავისუფალი ადგილების რაოდენობა")

    @property
    def available_seats(self):
        now = timezone.now()
        booked_count = self.tickets.filter(
            Q(status__in=[Ticket.TicketStatus.ACTIVE, Ticket.TicketStatus.USED]) |
            Q(status=Ticket.TicketStatus.PENDING, expires_at__gt=now)
        ).count()

        return self.train.total_seats - booked_count

    def __str__(self):
        return f"{self.departure_station.name} -> {self.arrival_station.name} | {self.departure_time.strftime('%Y-%m-%d %H:%M')}"

    class Meta:
        verbose_name = "რეისი"
        verbose_name_plural = "რეისები"


class Ticket(models.Model):

    class TicketStatus(models.TextChoices):
        PENDING = 'PENDING', 'მოლოდინში'
        ACTIVE = 'ACTIVE', 'აქტიური'
        USED = 'USED', 'გამოყენებული'
        CANCELLED = 'CANCELLED', 'გაუქმებული'

    user = models.ForeignKey('user.CustomUser', on_delete=models.CASCADE, verbose_name="მგზავრი", related_name="tickets")
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, verbose_name="რეისი", related_name="tickets")
    seat_number = models.PositiveIntegerField(verbose_name="ადგილის ნომერი")
    purchase_date = models.DateTimeField(auto_now_add=True, verbose_name="ყიდვის თარიღი")
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="ჯავშნის ვადის გასვლის დრო")

    status = models.CharField(
        max_length=20,
        choices=TicketStatus.choices,
        default=TicketStatus.PENDING,
        verbose_name="ბილეთის სტატუსი"
    )

    def __str__(self):
        return f"ბილეთი №{self.id} - {self.user.username} ({self.get_status_display()})"

    class Meta:
        verbose_name = "ბილეთი"
        verbose_name_plural = "ბილეთები"
