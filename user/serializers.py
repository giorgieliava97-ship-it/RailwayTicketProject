from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone_number',
                  'personal_id', 'first_name', 'last_name']
        read_only_fields = ['id']

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'phone_number', 'personal_id', 'first_name', 'last_name']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email',''),
            password=validated_data['password'],
            phone_number=validated_data.get('phone_number',''),
            personal_id=validated_data.get('personal_id',''),
            first_name=validated_data.get('first_name',''),
            last_name=validated_data.get('last_name',''),
        )
        return user