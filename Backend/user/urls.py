from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserRegisterView, UserDetailView, CustomLoginView, VerifyEmailView,
    PasswordResetRequestView, PasswordResetConfirmView, DeactivateAccountView,
    PasswordChangeView, UserProfileTicketsView, SavedPassengerViewSet
)


router = DefaultRouter()
router.register(r'saved-passengers', SavedPassengerViewSet, basename='saved-passenger')

urlpatterns = [
    path('register/', UserRegisterView.as_view(), name='user-register'),
    path('login/', CustomLoginView.as_view(), name='api-token-auth'),
    path('verify/<str:uidb64>/<str:token>/', VerifyEmailView.as_view(), name='verify-email'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset-confirm/<str:uidb64>/<str:token>/', PasswordResetConfirmView.as_view(),
         name='password-reset-confirm'),
    path('profile/', UserDetailView.as_view(), name='user-profile'),
    path('deactivate/', DeactivateAccountView.as_view(), name='user-deactivate'),
    path('password-change/', PasswordChangeView.as_view(), name='password-change'),
    path('profile-tickets/', UserProfileTicketsView.as_view(), name='user-profile-tickets'),

    path('', include(router.urls)),
]