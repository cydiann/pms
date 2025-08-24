from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count
from .models import Worksite, Division
from .serializers import WorksiteSerializer, DivisionSerializer
from .filters import WorksiteFilter, DivisionFilter

from authentication.models import User
from authentication.serializers import UserSerializer
from requisition.models import Request

class WorksiteViewSet(viewsets.ModelViewSet):
    queryset = Worksite.objects.all()
    serializer_class = WorksiteSerializer
    filterset_class = WorksiteFilter
    search_fields = ['address', 'city', 'country', 'chief__username', 'chief__first_name', 'chief__last_name']
    ordering_fields = ['city', 'country', 'address']
    ordering = ['city']
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]
    
    @action(detail=True, methods=['get'], url_path='users', url_name='users')
    def users(self, request, pk=None):
        """Get users in this worksite"""
        worksite = self.get_object()
        
        users = User.objects.filter(worksite=worksite, deleted_at__isnull=True)
        serializer = UserSerializer(users, many=True)
        
        return Response({
            'worksite': WorksiteSerializer(worksite).data,
            'user_count': users.count(),
            'users': serializer.data
        })
    
    @action(detail=True, methods=['get'], url_path='stats', url_name='stats')
    def stats(self, request, pk=None):
        """Get worksite statistics"""
        worksite = self.get_object()
        
        # Optimized: Single query for user stats
        from django.db.models import Q
        user_stats = User.objects.filter(worksite=worksite, deleted_at__isnull=True).aggregate(
            total_users=Count('id'),
            active_users=Count('id', filter=Q(is_active=True))
        )
        
        # Optimized: Single query for request status counts
        status_counts = Request.objects.filter(created_by__worksite=worksite).values('status').annotate(count=Count('id'))
        requests_by_status = {item['status']: item['count'] for item in status_counts}
        total_requests = sum(requests_by_status.values())
        
        return Response({
            'worksite': WorksiteSerializer(worksite).data,
            'total_users': user_stats['total_users'],
            'active_users': user_stats['active_users'],
            'inactive_users': user_stats['total_users'] - user_stats['active_users'],
            'total_requests': total_requests,
            'requests_by_status': requests_by_status
        })


class DivisionViewSet(viewsets.ModelViewSet):
    queryset = Division.objects.all()
    serializer_class = DivisionSerializer
    filterset_class = DivisionFilter
    search_fields = ['name', 'created_by__username', 'created_by__first_name', 'created_by__last_name', 'worksites__city', 'worksites__country']
    ordering_fields = ['name']
    ordering = ['name']
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]
    
    @action(detail=True, methods=['get'], url_path='users', url_name='users')
    def users(self, request, pk=None):
        """Get users in this division"""
        division = self.get_object()
        
        users = User.objects.filter(division=division, deleted_at__isnull=True)
        serializer = UserSerializer(users, many=True)
        
        return Response({
            'division': DivisionSerializer(division).data,
            'user_count': users.count(),
            'users': serializer.data
        })
    
    @action(detail=True, methods=['get'], url_path='stats', url_name='stats')
    def stats(self, request, pk=None):
        """Get division statistics"""
        division = self.get_object()
        
        # Optimized: Single query for user stats
        from django.db.models import Q
        user_stats = User.objects.filter(division=division, deleted_at__isnull=True).aggregate(
            total_users=Count('id'),
            active_users=Count('id', filter=Q(is_active=True))
        )
        
        # Optimized: Single query for request status counts
        status_counts = Request.objects.filter(created_by__division=division).values('status').annotate(count=Count('id'))
        requests_by_status = {item['status']: item['count'] for item in status_counts}
        total_requests = sum(requests_by_status.values())
        
        return Response({
            'division': DivisionSerializer(division).data,
            'total_users': user_stats['total_users'],
            'active_users': user_stats['active_users'],
            'inactive_users': user_stats['total_users'] - user_stats['active_users'],
            'total_requests': total_requests,
            'requests_by_status': requests_by_status
        })
