from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.core.mail import send_mail
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.conf import settings
from .models import SavedPassenger

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'phone_number', 'personal_id',
                  'first_name', 'last_name', 'gender', 'nationality']
        read_only_fields = ['id', 'email']

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['phone_number', 'personal_id', 'first_name', 'last_name', 'gender', 'nationality']

    def validate_phone_number(self, value):
        user = self.instance
        if User.objects.filter(phone_number=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("მომხმარებელი ამ ტელეფონის ნომრით უკვე არსებობს.")
        return value

    def validate_personal_id(self, value):
        user = self.instance
        if User.objects.filter(personal_id=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("მომხმარებელი ამ პირადი ნომრით უკვე არსებობს.")
        return value

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    gender = serializers.ChoiceField(choices=['male', 'female'], required=True)
    email = serializers.EmailField(required=True)
    phone_number = serializers.CharField(required=True)
    personal_id = serializers.CharField(required=True)
    nationality = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'gender', 'email',
            'phone_number', 'personal_id', 'nationality',
            'password', 'password_confirm'
        ]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("მომხმარებელი ამ ელ-ფოსტით უკვე არსებობს.")
        return value

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("მომხმარებელი ამ ტელეფონის ნომრით უკვე არსებობს.")
        return value

    def validate_personal_id(self, value):
        if User.objects.filter(personal_id=value).exists():
            raise serializers.ValidationError("მომხმარებელი ამ პირადი ნომრით უკვე არსებობს.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "პაროლები არ ემთხვევა ერთმანეთს."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        email = validated_data.get('email')

        user = User.objects.create_user(
            username=email,
            password=password,
            is_active=False,
            **validated_data
        )

        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        verification_url = f"{frontend_url}/verify/{uid}/{token}/"

        send_mail(
            subject='საქართველოს რკინიგზა - ანგარიშის ვერიფიკაცია',
            message=f'გამარჯობა {user.first_name},\n\nანგარიშის გასააქტიურებლად გთხოვთ ეწვიოთ შემდეგ ბმულს:\n{verification_url}',
            from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@railway.ge',
            recipient_list=[email],
            fail_silently=True,
        )

        return user

class CustomAuthTokenSerializer(serializers.Serializer):
    login_id = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        login_id = attrs.get('login_id')
        password = attrs.get('password')

        if login_id and password:
            user = User.objects.filter(Q(email=login_id) | Q(phone_number=login_id)).first()

            if user and user.check_password(password):
                if not user.is_active:
                    raise serializers.ValidationError('ანგარიში არ არის ვერიფიცირებული. გთხოვთ შეამოწმოთ თქვენი ელ-ფოსტა.')
                attrs['user'] = user
                return attrs
            else:
                raise serializers.ValidationError('არასწორი ელ-ფოსტა/ტელეფონი ან პაროლი.')
        else:
            raise serializers.ValidationError('გთხოვთ მიუთითოთ ელ-ფოსტა/ტელეფონი და პაროლი.')

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate(self, attrs):
        email = attrs.get('email')
        if not User.objects.filter(email=email).exists():
            raise serializers.ValidationError("მომხმარებელი ამ ელ-ფოსტით არ მოიძებნება.")
        return attrs

class PasswordResetConfirmSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "პაროლები არ ემთხვევა ერთმანეთს."})
        return attrs

class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    new_password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    new_password_confirm = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "ახალი პაროლები არ ემთხვევა ერთმანეთს."})
        return attrs

class SavedPassengerSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedPassenger
        fields = ['id', 'first_name', 'last_name', 'personal_id', 'birth_date', 'created_at']
        read_only_fields = ['id', 'created_at']