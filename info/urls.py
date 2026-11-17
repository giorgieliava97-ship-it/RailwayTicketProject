from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InfoPageViewSet

router = DefaultRouter()
router.register(r'info-pages', InfoPageViewSet, basename='infopage')

urlpatterns = [
    path('', include(router.urls)),
]