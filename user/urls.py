from django.urls import path
from .views import UserRegisterView, UserDetailView
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('register/', UserRegisterView.as_view(), name='user-register'),
    path('<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('login/', obtain_auth_token, name='api-token-auth'),
]