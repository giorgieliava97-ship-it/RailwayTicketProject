from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from user.models import CustomUser
from tickets.models import Ticket, Trip, Train, Station
from payments.models import Payment


class PaymentViewSetTests(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username="testuser1",
            email="user@test.com",
            password="password123",
            phone_number="555111222",
            personal_id="01010101011"
        )
        self.other_user = CustomUser.objects.create_user(
            username="testuser2",
            email="other@test.com",
            password="password123",
            phone_number="555333444",
            personal_id="02020202022"
        )

        self.station1 = Station.objects.create(name="თბილისი", code="4001")
        self.station2 = Station.objects.create(name="ბათუმი", code="4012")
        self.train = Train.objects.create(train_number="802", wagons_count=4)
        self.trip = Trip.objects.create(
            train=self.train,
            departure_station=self.station1,
            arrival_station=self.station2,
            departure_time=timezone.now() + timedelta(days=1),
            arrival_time=timezone.now() + timedelta(days=1, hours=5),
            base_price=35.00
        )

        self.ticket = Ticket.objects.create(
            user=self.user,
            trip=self.trip,
            seat_number=10,
            price=35.00,
            status=Ticket.TicketStatus.PENDING,
            expires_at=timezone.now() + timedelta(minutes=10)
        )
        self.payment = Payment.objects.create(
            ticket=self.ticket,
            amount=35.00,
            status=Payment.PaymentStatus.PENDING,
            transaction_id="txn-12345"
        )

    def test_get_payments_list_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/payments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.payment.id)

    def test_get_payments_unauthorized(self):
        response = self.client.get('/api/payments/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_pay_success(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/payments/{self.payment.id}/pay/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['payment']['status'], 'SUCCESS')

        self.payment.refresh_from_db()
        self.ticket.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.PaymentStatus.SUCCESS)
        self.assertEqual(self.ticket.status, Ticket.TicketStatus.ACTIVE)
        self.assertIsNone(self.ticket.expires_at)

    def test_pay_already_success(self):
        self.payment.status = Payment.PaymentStatus.SUCCESS
        self.payment.save()

        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/payments/{self.payment.id}/pay/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("უკვე წარმატებით არის შესრულებული", response.data['detail'])

    def test_pay_failed_status(self):
        self.payment.status = Payment.PaymentStatus.FAILED
        self.payment.save()

        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/payments/{self.payment.id}/pay/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("წარუმატებელია", response.data['detail'])

    def test_pay_ticket_expired(self):
        self.ticket.expires_at = timezone.now() - timedelta(minutes=1)
        self.ticket.save()

        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/payments/{self.payment.id}/pay/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ვადა (10 წუთი) გასულია", response.data['detail'])