from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.utils import timezone
from datetime import timedelta
from tickets.models import Station, Train, Trip, Ticket
from .models import SavedPassenger

User = get_user_model()


class UserAppFullCoverageTestCase(APITestCase):
    def setUp(self):
        # 1. ძირითადი აქტიური სატესტო მომხმარებელი
        self.user = User.objects.create_user(
            username="testuser@test.com",
            email="testuser@test.com",
            password="password123",
            phone_number="555112233",
            personal_id="01010101011",
            first_name="გიორგი",
            last_name="ელიავა",
            gender="male",
            nationality="საქართველო",
            is_active=True
        )

        # 2. არაქტიური მომხმარებელი (ვერიფიკაციის ტესტებისთვის)
        self.inactive_user = User.objects.create_user(
            username="inactive@test.com",
            email="inactive@test.com",
            password="password123",
            phone_number="555445566",
            personal_id="02020202022",
            first_name="ნინო",
            last_name="ბერიძე",
            gender="female",
            nationality="საქართველო",
            is_active=False
        )

    def test_01_user_registration_success_and_validations(self):
        """ვამოწმებთ მომხმარებლის რეგისტრაციას და დუბლირებული/არასწორი მონაცემების ვალიდაციებს"""
        # ა) წარმატებული რეგისტრაცია (is_active უნდა იყოს False)
        reg_data = {
            "first_name": "დავით",
            "last_name": "კაკაბაძე",
            "gender": "male",
            "email": "newuser@test.com",
            "phone_number": "555778899",
            "personal_id": "03030303033",
            "nationality": "საქართველო",
            "password": "SecurePassword123",
            "password_confirm": "SecurePassword123"
        }
        res = self.client.post('/api/users/register/', reg_data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        new_user = User.objects.get(email="newuser@test.com")
        self.assertFalse(new_user.is_active)

        # ბ) პაროლების შეუსაბამობა
        reg_data_bad_pw = reg_data.copy()
        reg_data_bad_pw['email'] = "newuser2@test.com"
        reg_data_bad_pw['phone_number'] = "555001122"
        reg_data_bad_pw['personal_id'] = "04040404044"
        reg_data_bad_pw['password_confirm'] = "DifferentPassword"

        res_pw = self.client.post('/api/users/register/', reg_data_bad_pw, format='json')
        self.assertEqual(res_pw.status_code, status.HTTP_400_BAD_REQUEST)

        # გ) დუბლირებული ელ-ფოსტა
        reg_data_dup = reg_data.copy()
        reg_data_dup['phone_number'] = "555999999"
        reg_data_dup['personal_id'] = "05050505055"
        res_dup = self.client.post('/api/users/register/', reg_data_dup, format='json')
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)

    def test_02_email_verification(self):
        """ვამოწმებთ ელ-ფოსტის ვერიფიკაციის ენდპოინტს (მაქტიურებს ანგარიშს)"""
        token = default_token_generator.make_token(self.inactive_user)
        uid = urlsafe_base64_encode(force_bytes(self.inactive_user.pk))

        url = f'/api/users/verify/{uid}/{token}/'
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.inactive_user.refresh_from_db()
        self.assertTrue(self.inactive_user.is_active)

        # არასწორი ტოკენის ან UID-ის ტესტი
        res_bad = self.client.get('/api/users/verify/baduid/badtoken/')
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)

    def test_03_custom_login_and_inactive_block(self):
        """ვამოწმებთ ავტორიზაციას (ელ-ფოსტით/ტელეფონით) და არაქტიური იუზერის ბლოკირებას"""
        # ა) შესვლა ელ-ფოსტით (აქტიური იუზერი)
        res_email = self.client.post('/api/users/login/', {
            "login_id": "testuser@test.com",
            "password": "password123"
        }, format='json')
        self.assertEqual(res_email.status_code, status.HTTP_200_OK)
        self.assertIn('token', res_email.data)

        # ბ) შესვლა ტელეფონის ნომრით
        res_phone = self.client.post('/api/users/login/', {
            "login_id": "555112233",
            "password": "password123"
        }, format='json')
        self.assertEqual(res_phone.status_code, status.HTTP_200_OK)

        # გ) არაქტიური იუზერის შესვლის მცდელობა (უნდა დაიბლოკოს)
        res_inactive = self.client.post('/api/users/login/', {
            "login_id": "inactive@test.com",
            "password": "password123"
        }, format='json')
        self.assertEqual(res_inactive.status_code, status.HTTP_400_BAD_REQUEST)

        # დ) არასწორი პაროლი
        res_wrong = self.client.post('/api/users/login/', {
            "login_id": "testuser@test.com",
            "password": "wrongpassword"
        }, format='json')
        self.assertEqual(res_wrong.status_code, status.HTTP_400_BAD_REQUEST)

    def test_04_user_profile_get_and_update(self):
        """ვამოწმებთ პროფილის წამოღებას და განახლებას (მათ შორის უნიკალური ტელეფონისა და პირადი ნომრის ვალიდაციას)"""
        self.client.force_authenticate(user=self.user)

        # ა) GET Profile
        res_get = self.client.get('/api/users/profile/')
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(res_get.data['email'], self.user.email)

        # ბ) PATCH Profile (წარმატებული განახლება)
        res_patch = self.client.patch('/api/users/profile/', {
            "first_name": "გია",
            "phone_number": "555998877"
        }, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "გია")
        self.assertEqual(self.user.phone_number, "555998877")

    def test_05_password_change_and_reset(self):
        """ვამოწმებთ პაროლის შეცვლას და აღდგენის მოთხოვნას/დადასტურებას"""
        self.client.force_authenticate(user=self.user)

        # ა) პაროლის შეცვლა ძველი პაროლით
        res_chg = self.client.post('/api/users/password-change/', {
            "old_password": "password123",
            "new_password": "NewSecurePassword123",
            "new_password_confirm": "NewSecurePassword123"
        }, format='json')
        self.assertEqual(res_chg.status_code, status.HTTP_200_OK)

        # ბ) არასწორი ძველი პაროლი
        res_bad_old = self.client.post('/api/users/password-change/', {
            "old_password": "wrongoldpassword",
            "new_password": "AnotherPassword123",
            "new_password_confirm": "AnotherPassword123"
        }, format='json')
        self.assertEqual(res_bad_old.status_code, status.HTTP_400_BAD_REQUEST)

        # გ) პაროლის აღდგენის მოთხოვნა (Password Reset Request)
        self.client.logout()
        res_req = self.client.post('/api/users/password-reset/', {
            "email": "testuser@test.com"
        }, format='json')
        self.assertEqual(res_req.status_code, status.HTTP_200_OK)

        # დ) არარსებული ელ-ფოსტით აღდგენის მოთხოვნა
        res_req_bad = self.client.post('/api/users/password-reset/', {
            "email": "nonexistent@test.com"
        }, format='json')
        self.assertEqual(res_req_bad.status_code, status.HTTP_400_BAD_REQUEST)

        # ე) პაროლის აღდგენის დადასტურება (Confirm)
        token = default_token_generator.make_token(self.user)
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        res_conf = self.client.post(f'/api/users/password-reset-confirm/{uid}/{token}/', {
            "password": "ResetPassword123",
            "password_confirm": "ResetPassword123"
        }, format='json')
        self.assertEqual(res_conf.status_code, status.HTTP_200_OK)

    def test_06_deactivate_account(self):
        """ვამოწმებთ ანგარიშის დეაქტივაციას"""
        self.client.force_authenticate(user=self.user)
        res = self.client.post('/api/users/deactivate/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_07_user_profile_tickets(self):
        """ვამოწმებთ მომხმარებლის პროფილის ბილეთების კატეგორიებად გამოტანას"""
        self.client.force_authenticate(user=self.user)

        # ვქმნით სატესტო სადგურებს, მატარებელს, რეისს და სხვადასხვა სტატუსის ბილეთებს
        station1 = Station.objects.create(name="თბილისი", code="4001")
        station2 = Station.objects.create(name="ბათუმი", code="4012")
        train = Train.objects.create(train_number="802", wagons_count=2)
        trip = Trip.objects.create(
            train=train, departure_station=station1, arrival_station=station2,
            departure_time=timezone.now() + timedelta(days=1),
            arrival_time=timezone.now() + timedelta(days=1, hours=5),
            base_price=35.00
        )

        Ticket.objects.create(
            user=self.user, trip=trip, seat_number=1, price=35.00,
            status=Ticket.TicketStatus.ACTIVE, first_name="გიორგი", last_name="ელიავა"
        )
        Ticket.objects.create(
            user=self.user, trip=trip, seat_number=2, price=35.00,
            status=Ticket.TicketStatus.USED, first_name="ნინო", last_name="ბერიძე"
        )
        Ticket.objects.create(
            user=self.user, trip=trip, seat_number=3, price=35.00,
            status=Ticket.TicketStatus.CANCELLED, first_name="დავით", last_name="კაკაბაძე"
        )

        res = self.client.get('/api/users/profile-tickets/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['active_tickets']), 1)
        self.assertEqual(len(res.data['history_tickets']), 1)
        self.assertEqual(len(res.data['returned_tickets']), 1)

    def test_08_saved_passenger_viewset(self):
        """ვამოწმებთ დამახსოვრებული მგზავრების (SavedPassenger) CRUD ოპერაციებს"""
        self.client.force_authenticate(user=self.user)

        # ა) მგზავრის დამატება (POST)
        res_create = self.client.post('/api/users/saved-passengers/', {
            "first_name": "ლევან",
            "last_name": "სვანიძე",
            "personal_id": "01024039485",
            "birth_date": "1990-05-15"
        }, format='json')
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        passenger_id = res_create.data['id']

        # ბ) მგზავრების სიის წამოღება (GET)
        res_list = self.client.get('/api/users/saved-passengers/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.data), 1)

        # გ) მგზავრის წაშლა (DELETE)
        res_del = self.client.delete(f'/api/users/saved-passengers/{passenger_id}/')
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(SavedPassenger.objects.count(), 0)