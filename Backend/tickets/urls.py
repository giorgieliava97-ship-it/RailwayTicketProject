from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StationViewSet, TrainViewSet, TripViewSet,
    TicketViewSet, TripSeatMapView, ScheduleAPIView,
    auto_assign_seats, book_manual_seats
)

router = DefaultRouter()
router.register(r'stations', StationViewSet, basename='station')
router.register(r'trains', TrainViewSet, basename='train')
router.register(r'trips', TripViewSet, basename='trip')
router.register(r'tickets', TicketViewSet, basename='ticket')

urlpatterns = [
    path('', include(router.urls)),
    path('schedule/', ScheduleAPIView.as_view(), name='schedule-api'),
    path('trips/<int:trip_id>/seat-map/', TripSeatMapView.as_view(), name='trip-seat-map'),
    path('trips/<int:trip_id>/auto-assign/', auto_assign_seats, name='auto_assign_seats'),
    path('trips/<int:trip_id>/book-manual/', book_manual_seats, name='book-manual-seats'),
]