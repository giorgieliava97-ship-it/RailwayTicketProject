from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from .serializers import (
    UserSerializer, UserProfileUpdateSerializer, UserRegisterSerializer, CustomAuthTokenSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer, PasswordChangeSerializer
)
from tickets.models import Ticket
from tickets.serializers import TicketSerializer
from rest_framework.views import APIView
from rest_framework import viewsets
from .models import SavedPassenger
from .serializers import SavedPassengerSerializer
from rest_framework import serializers

User = get_user_model()

class UserRegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [AllowAny]

class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserProfileUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user


class DeactivateAccountView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = serializers.Serializer

    def post(self, request, *args, **kwargs):
        if getattr(self, 'swagger_fake_view', False):
            return Response(None)

        user = request.user
        user.is_active = False
        user.save()
        return Response({"detail": "ანგარიში წარმატებით დეაქტივირდა."}, status=status.HTTP_200_OK)

class CustomLoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = CustomAuthTokenSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
            'user_id': user.id,
            'email': user.email,
            'first_name': user.first_name
        })

class VerifyEmailView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = serializers.Serializer

    def get(self, request, uidb64, token, *args, **kwargs):
        if getattr(self, 'swagger_fake_view', False):
            return Response(None)

        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.is_active = True
            user.save()
            return Response({"detail": "ანგარიში წარმატებით გააქტიურდა! შეგიძლიათ გაიაროთ ავტორიზაცია."}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "ვერიფიკაციის ბმული არასწორია ან ვადაგასულია."}, status=status.HTTP_400_BAD_REQUEST)
class PasswordResetRequestView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        user = User.objects.get(email=email)

        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_url = f"{frontend_url}/reset-password/{uid}/{token}/"

        send_mail(
            subject='საქართველოს რკინიგზა - პაროლის აღდგენა',
            message=f'გამარჯობა {user.first_name},\n\nპაროლის აღსადგენად გთხოვთ ეწვიოთ ბმულს:\n{reset_url}',
            from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@railway.ge',
            recipient_list=[email],
            fail_silently=True,
        )

        return Response({"detail": "პაროლის აღდგენის ინსტრუქცია გამოგზავნილია თქვენს ელ-ფოსტაზე."},
                        status=status.HTTP_200_OK)

class PasswordResetConfirmView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request, uidb64, token, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(serializer.validated_data['password'])
            user.save()
            return Response({"detail": "პაროლი წარმატებით შეიცვალა!"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "აღდგენის ბმული არასწორია ან ვადაგასულია."}, status=status.HTTP_400_BAD_REQUEST)


class PasswordChangeView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PasswordChangeSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        old_password = serializer.validated_data['old_password']

        # ძველი პაროლის შემოწმება
        if not user.check_password(old_password):
            return Response({"old_password": ["ძველი პაროლი არასწორია."]}, status=status.HTTP_400_BAD_REQUEST)

        # ახალი პაროლის შენახვა
        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({"detail": "პაროლი წარმატებით შეიცვალა!"}, status=status.HTTP_200_OK)


class UserProfileTicketsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        tickets = Ticket.objects.filter(user=user).select_related(
            'trip', 'trip__train', 'trip__departure_station', 'trip__arrival_station'
        )

        # ვყოფთ 3 კატეგორიად :
        active_qs = tickets.filter(status=Ticket.TicketStatus.ACTIVE)
        history_qs = tickets.filter(status=Ticket.TicketStatus.USED)
        returned_qs = tickets.filter(status=Ticket.TicketStatus.CANCELLED)

        return Response({
            "active_tickets": TicketSerializer(active_qs, many=True, context={'request': request}).data,
            "history_tickets": TicketSerializer(history_qs, many=True, context={'request': request}).data,
            "returned_tickets": TicketSerializer(returned_qs, many=True, context={'request': request}).data,
        }, status=200)

class SavedPassengerViewSet(viewsets.ModelViewSet):
    serializer_class = SavedPassengerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SavedPassenger.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)