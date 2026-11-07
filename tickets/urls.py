from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StationViewSet, TrainViewSet, TripViewSet, TicketViewSet, TripSeatMapView

router = DefaultRouter()
router.register(r'stations', StationViewSet, basename='station')
router.register(r'trains', TrainViewSet, basename='train')
router.register(r'trips', TripViewSet, basename='trip')
router.register(r'tickets', TicketViewSet, basename='ticket')

urlpatterns = [
    path('', include(router.urls)),
    path('trips/<int:trip_id>/seats/', TripSeatMapView.as_view(), name='trip-seat-map'),
]