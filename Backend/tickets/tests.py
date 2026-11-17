from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from user.models import CustomUser
from .models import Station, Train, Trip, Ticket


class FullCoverageTicketsTestCase(APITestCase):
    def setUp(self):
        # 1. სატესტო იუზერები
        self.user1 = CustomUser.objects.create_user(
            username="testuser1",
            email="user1@test.com",
            password="password123",
            phone_number="555111222",
            personal_id="01010101011"
        )
        self.user2 = CustomUser.objects.create_user(
            username="testuser2",
            email="user2@test.com",
            password="password123",
            phone_number="555333444",
            personal_id="02020202022"
        )

        # 2. სადგურები
        self.station_tbilisi = Station.objects.create(name="თბილისი", code="4001", city="თბილისი")
        self.station_gori = Station.objects.create(name="გორი", code="4005", city="გორი")
        self.station_batumi = Station.objects.create(name="ბათუმი", code="4012", city="ბათუმი")

        # 3. მატარებლები (სტანდარტული და ექსპრესი ორსართულიანი)
        self.standard_train = Train.objects.create(
            train_number="12",
            category=Train.Category.MAGISTRAL,
            wagons_count=2,
            second_class_seats=26,
            first_class_seats=0,
            business_class_seats=0
        )

        self.express_train = Train.objects.create(
            train_number="802",  # ექსპრესი (ორსართულიანი ვაგონის ლოგიკისთვის)
            category=Train.Category.MAGISTRAL,
            wagons_count=2,
            second_class_seats=50,
            first_class_seats=28,
            business_class_seats=20
        )

        # 4. რეისები
        dep_time = timezone.now() + timedelta(days=1)
        arr_time = dep_time + timedelta(hours=5)

        self.trip = Trip.objects.create(
            train=self.standard_train,
            departure_station=self.station_tbilisi,
            arrival_station=self.station_batumi,
            departure_time=dep_time,
            arrival_time=arr_time,
            base_price=35.00,
            stops=[
                {"station": "გორი", "time": (dep_time + timedelta(hours=2)).strftime('%H:%M')}
            ]
        )

        self.express_trip = Trip.objects.create(
            train=self.express_train,
            departure_station=self.station_tbilisi,
            arrival_station=self.station_batumi,
            departure_time=dep_time + timedelta(days=1),
            arrival_time=arr_time + timedelta(days=1),
            base_price=45.00,
            stops=[]
        )

    def test_01_stations_and_trains_permissions(self):
        """ვამოწმებთ სადგურებისა და მატარებლების წაკითხვას და მოდიფიკაციის ბლოკირებას არაავტორიზებულისთვის"""
        res = self.client.get('/api/stations/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res_post = self.client.post('/api/stations/', {"name": "ქუთაისი", "code": "4020"})
        self.assertEqual(res_post.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_02_trip_filtering_by_date_and_stations(self):
        """ვამოწმებთ რეისების ფილტრაციას სადგურებით და კონკრეტული თარიღით"""
        target_date = self.trip.departure_time.date().isoformat()

        url = f'/api/trips/?departure_station=თბილისი&arrival_station=ბათუმი&date={target_date}'
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)

        # არარსებული თარიღი
        res_empty = self.client.get('/api/trips/?date=2030-01-01')
        self.assertEqual(res_empty.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_empty.data), 0)

    def test_03_schedule_api(self):
        """ვამოწმებთ განრიგის (Schedule) ენდპოინტს"""
        res = self.client.get('/api/schedule/?departure_station=თბილისი&arrival_station=გორი')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)

    def test_04_seat_maps_standard_and_express(self):
        """ვამოწმებთ როგორც სტანდარტული, ისე ორსართულიანი ექსპრესი მატარებლის ვაგონების რუკებს"""
        res_std = self.client.get(
            f'/api/trips/{self.trip.id}/seat-map/?wagon=1&board_station=თბილისი&arrival_station=ბათუმი')
        self.assertEqual(res_std.status_code, status.HTTP_200_OK)
        self.assertIn('layout', res_std.data)

        res_exp = self.client.get(
            f'/api/trips/{self.express_trip.id}/seat-map/?wagon=1&board_station=თბილისი&arrival_station=ბათუმი')
        self.assertEqual(res_exp.status_code, status.HTTP_200_OK)
        floors = res_exp.data.get('layout', {}).get('floors', [])
        self.assertGreaterEqual(len(floors), 2)

    def test_05_auto_assign_edge_cases(self):
        """ვამოწმებთ auto-assign-ის ვალიდაციებს (რაოდენობის ლიმიტები 1-9)"""
        self.client.force_authenticate(user=self.user1)

        # რაოდენობა 0 (არასწორია)
        res_zero = self.client.post(f'/api/trips/{self.trip.id}/auto-assign/', {
            "seat_class": "SECOND", "quantity": 0,
            "board_station": "თბილისი", "leave_station": "ბათუმი"
        }, format='json')
        self.assertEqual(res_zero.status_code, status.HTTP_400_BAD_REQUEST)

        # რაოდენობა 10 (მაქსიმუმია 9)
        res_max = self.client.post(f'/api/trips/{self.trip.id}/auto-assign/', {
            "seat_class": "SECOND", "quantity": 10,
            "board_station": "თბილისი", "leave_station": "ბათუმი"
        }, format='json')
        self.assertEqual(res_max.status_code, status.HTTP_400_BAD_REQUEST)

        # სწორი რაოდენობა (2)
        res_ok = self.client.post(f'/api/trips/{self.trip.id}/auto-assign/', {
            "seat_class": "SECOND", "quantity": 2,
            "board_station": "თბილისი", "leave_station": "ბათუმი"
        }, format='json')
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertTrue(res_ok.data['success'])

    def test_06_overlapping_segment_seat_booking(self):
        """ვამოწმებთ სეგმენტურ ლოგიკას: იგივე ადგილი შეიძლება დაიკავონ სხვადასხვა არაკვეთად სეგმენტზე"""
        # User 1 იღებს მე-5 ადგილს თბილისიდან გორამდე
        Ticket.objects.create(
            user=self.user1,
            trip=self.trip,
            seat_number=5,
            first_name="გიორგი",
            last_name="მელიქიძე",
            id_number="01010101011",
            price=15.00,
            board_station="თბილისი",
            leave_station="გორი",
            board_time=self.trip.departure_time,
            leave_time=self.trip.departure_time + timedelta(hours=2),
            status=Ticket.TicketStatus.ACTIVE
        )

        # User 2-ს უნდა შეეძლოს იგივე მე-5 ადგილის აღება გორიდან ბათუმამდე (არაკვეთადი სეგმენტი)
        self.client.force_authenticate(user=self.user2)
        res = self.client.post(f'/api/trips/{self.trip.id}/book-manual/', {
            "seat_class": "SECOND",
            "board_station": "გორი",
            "leave_station": "ბათუმი",
            "passengers": [
                {
                    "seatNumber": 5,
                    "firstName": "ნინო",
                    "lastName": "ბერიძე",
                    "idNumber": "02020202022",
                    "birthDate": "1990-01-01"
                }
            ]
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # მაგრამ თუ User 2 შეეცდება აიღოს მე-5 ადგილი თბილისიდან ბათუმამდე (იკვეთება), უნდა ჩაჭრას!
        res_overlap = self.client.post(f'/api/trips/{self.trip.id}/book-manual/', {
            "seat_class": "SECOND",
            "board_station": "თბილისი",
            "leave_station": "ბათუმი",
            "passengers": [
                {
                    "seatNumber": 5,
                    "firstName": "დავით",
                    "lastName": "კაკაბაძე",
                    "idNumber": "03030303033",
                    "birthDate": "1992-02-02"
                }
            ]
        }, format='json')
        self.assertEqual(res_overlap.status_code, status.HTTP_400_BAD_REQUEST)

    def test_07_manual_booking_validations_and_return(self):
        """ვამოწმებთ მანუალური დაჯავშნის ყველა ვალიდაციას, PENDING დუბლირების ბლოკირებას და ბილეთის დაბრუნებას"""
        self.client.force_authenticate(user=self.user1)

        passengers = [
            {
                "seatNumber": 10,
                "firstName": "ლუკა",
                "lastName": "გიორგაძე",
                "idNumber": "11111111111",
                "birthDate": "1998-10-10"
            }
        ]

        # 1. წარმატებული დაჯავშნა (PENDING)
        res = self.client.post(f'/api/trips/{self.trip.id}/book-manual/', {
            "seat_class": "SECOND",
            "board_station": "თბილისი",
            "leave_station": "ბათუმი",
            "passengers": passengers
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        ticket = Ticket.objects.get(id_number="11111111111")

        # 2. PENDING დუბლირების შემოწმება (უნდა დაიბლოკოს 400-ით)
        res_pending_dup = self.client.post(f'/api/trips/{self.trip.id}/book-manual/', {
            "seat_class": "SECOND",
            "board_station": "თბილისი",
            "leave_station": "ბათუმი",
            "passengers": passengers
        }, format='json')
        self.assertEqual(res_pending_dup.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. უკვე გაუქმებული ან არაქტიური ბილეთის დაბრუნების მცდელობა
        ticket.status = Ticket.TicketStatus.CANCELLED
        ticket.save()

        res_return_cancelled = self.client.post(f'/api/tickets/{ticket.id}/return_ticket/')
        self.assertEqual(res_return_cancelled.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. ნამდვილი აქტიური ბილეთის დაბრუნება (SUCCESS / OK)
        ticket.status = Ticket.TicketStatus.ACTIVE
        ticket.save()

        res_return_ok = self.client.post(f'/api/tickets/{ticket.id}/return_ticket/')
        self.assertEqual(res_return_ok.status_code, status.HTTP_200_OK)

        ticket.refresh_from_db()
        self.assertEqual(ticket.status, Ticket.TicketStatus.CANCELLED)