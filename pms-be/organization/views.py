from rest_framework import viewsets, permissions
from .models import Worksite, Division
from .serializers import WorksiteSerializer, DivisionSerializer


class WorksiteViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Worksite.objects.all()
    serializer_class = WorksiteSerializer
    permission_classes = [permissions.IsAuthenticated]


class DivisionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Division.objects.all()
    serializer_class = DivisionSerializer
    permission_classes = [permissions.IsAuthenticated]
