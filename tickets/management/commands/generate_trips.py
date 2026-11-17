from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from tickets.models import Trip


class Command(BaseCommand):
    help = 'გენერირებას უკეთებს რეისებს მომავალი თარიღებისთვის არსებული შაბლონების მიხედვით'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='რამდენი დღის წინასწარ გენერირება მოხდეს (ნაგულისხმევი: 30 დღე)',
        )

    def handle(self, *args, **options):
        days_ahead = options['days']

        base_trips = Trip.objects.all()
        if not base_trips.exists():
            self.stdout.write(self.style.WARNING("ბაზაში რეისები ვერ მოიძებნა! ჯერ შექმენი რამდენიმე რეისი."))
            return

        today = timezone.now().date()
        created_count = 0

        self.stdout.write(f"იწყება რეისების გენერაცია მომავალი {days_ahead} დღისთვის...")

        for day_offset in range(days_ahead):
            target_date = today + timedelta(days=day_offset)

            for trip in base_trips:
                old_dep = trip.departure_time
                old_arr = trip.arrival_time
                duration = old_arr - old_dep

                new_dep = timezone.make_aware(
                    timezone.datetime.combine(target_date, old_dep.time())
                )
                new_arr = new_dep + duration

                # ვამოწმებთ, არსებობს თუ არა უკვე ასეთი რეისი ამ თარიღში
                exists = Trip.objects.filter(
                    train=trip.train,
                    departure_station=trip.departure_station,
                    arrival_station=trip.arrival_station,
                    departure_time=new_dep
                ).exists()

                if not exists:
                    Trip.objects.create(
                        train=trip.train,
                        departure_station=trip.departure_station,
                        arrival_station=trip.arrival_station,
                        departure_time=new_dep,
                        arrival_time=new_arr,
                        stops=trip.stops
                    )
                    created_count += 1

        self.stdout.write(self.style.SUCCESS(f"წარმატებით გენერირდა {created_count} ახალი რეისი!"))