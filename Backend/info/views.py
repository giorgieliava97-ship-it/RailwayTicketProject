from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import InfoPage
from .serializers import InfoPageSerializer

class InfoPageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InfoPage.objects.all()
    serializer_class = InfoPageSerializer
    permission_classes = [AllowAny]
    pagination_class = None