from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from datetime import datetime, timedelta
from django.utils import timezone
from collections import defaultdict

from authentication.models import User
from organization.models import Worksite, Division
from requisition.models import Request
from .serializers import SystemStatsSerializer, WorksiteStatsSerializer, DivisionStatsSerializer


class CoreViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]
    
    @action(detail=False, methods=['get'], url_path='system-stats', url_name='system-stats')
    def system_stats(self, request):
        """Comprehensive system statistics for admin dashboard"""
        
        # Optimized: Single query for user statistics with aggregation
        from django.db.models import Q, Case, When, IntegerField, Sum
        
        user_stats = User.objects.filter(deleted_at__isnull=True).aggregate(
            total_users=Count('id'),
            active_users=Count('id', filter=Q(is_active=True)),
            admin_users=Count('id', filter=Q(is_superuser=True))
        )
        
        total_users = user_stats['total_users']
        active_users = user_stats['active_users']
        inactive_users = total_users - active_users
        admin_users = user_stats['admin_users']
        
        # Organization statistics - single query each
        total_worksites = Worksite.objects.count()
        total_divisions = Division.objects.count()
        
        # Request statistics - optimized with single query
        status_counts = Request.objects.values('status').annotate(count=Count('id'))
        requests_by_status = {item['status']: item['count'] for item in status_counts}
        total_requests = sum(requests_by_status.values())
        
        # Category counts - single query
        category_counts = Request.objects.values('category').annotate(count=Count('id'))
        requests_by_category = {item['category']: item['count'] for item in category_counts}
        
        # Extract specific status counts
        pending_requests = requests_by_status.get('pending', 0)
        approved_requests = requests_by_status.get('approved', 0)
        rejected_requests = requests_by_status.get('rejected', 0)
        completed_requests = requests_by_status.get('completed', 0)
        
        # Optimized: Get worksite statistics with aggregation
        worksite_stats = Worksite.objects.annotate(
            total_users=Count('user', filter=Q(user__deleted_at__isnull=True)),
            active_users=Count('user', filter=Q(user__deleted_at__isnull=True, user__is_active=True)),
            total_requests=Count('user__created_requests')
        ).values('id', 'city', 'country', 'total_users', 'active_users', 'total_requests')
        
        worksites_data = []
        for worksite in worksite_stats:
            worksites_data.append({
                'id': worksite['id'],
                'name': f"{worksite['city']}, {worksite['country']}",
                'total_users': worksite['total_users'],
                'active_users': worksite['active_users'],
                'inactive_users': worksite['total_users'] - worksite['active_users'],
                'total_requests': worksite['total_requests']
            })
        
        # Optimized: Get division statistics with aggregation
        division_stats = Division.objects.annotate(
            total_users=Count('user', filter=Q(user__deleted_at__isnull=True)),
            active_users=Count('user', filter=Q(user__deleted_at__isnull=True, user__is_active=True)),
            total_requests=Count('user__created_requests')
        ).values('id', 'name', 'total_users', 'active_users', 'total_requests')
        
        divisions_data = []
        for division in division_stats:
            divisions_data.append({
                'id': division['id'],
                'name': division['name'],
                'total_users': division['total_users'],
                'active_users': division['active_users'],
                'inactive_users': division['total_users'] - division['active_users'],
                'total_requests': division['total_requests']
            })
        
        # Optimized: Monthly trends using database aggregation
        from django.db.models.functions import TruncMonth
        
        six_months_ago = timezone.now() - timedelta(days=180)
        monthly_data = (
            Request.objects
            .filter(created_at__gte=six_months_ago)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        
        monthly_trends = {}
        for item in monthly_data:
            month_name = item['month'].strftime('%Y-%m')
            monthly_trends[month_name] = item['count']
        
        # Top requesters (users with most requests) - already optimized with single query
        top_requesters_data = (
            Request.objects
            .values('created_by__username', 'created_by__first_name', 'created_by__last_name')
            .annotate(request_count=Count('id'))
            .order_by('-request_count')[:10]
        )
        
        top_requesters = []
        for item in top_requesters_data:
            full_name = f"{item['created_by__first_name']} {item['created_by__last_name']}".strip()
            top_requesters.append({
                'username': item['created_by__username'],
                'full_name': full_name or item['created_by__username'],
                'request_count': item['request_count']
            })
        
        data = {
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': inactive_users,
            'admin_users': admin_users,
            'total_worksites': total_worksites,
            'total_divisions': total_divisions,
            'total_requests': total_requests,
            'pending_requests': pending_requests,
            'approved_requests': approved_requests,
            'rejected_requests': rejected_requests,
            'completed_requests': completed_requests,
            'requests_by_status': requests_by_status,
            'requests_by_category': requests_by_category,
            'worksites_with_users': worksites_data,
            'divisions_with_users': divisions_data,
            'monthly_trends': monthly_trends,
            'top_requesters': top_requesters
        }
        
        serializer = SystemStatsSerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='worksite-breakdown', url_name='worksite-breakdown')
    def worksite_breakdown(self, request):
        """Detailed breakdown of all worksites"""
        
        # Optimized: Single query with aggregation for worksite statistics
        worksite_stats = Worksite.objects.annotate(
            total_users=Count('user', filter=Q(user__deleted_at__isnull=True), distinct=True),
            active_users=Count('user', filter=Q(user__deleted_at__isnull=True, user__is_active=True), distinct=True),
            total_requests=Count('user__created_requests')
        ).values('id', 'city', 'country', 'total_users', 'active_users', 'total_requests')
        
        # Get request status breakdown per worksite in one query
        request_status_by_worksite = (
            Request.objects
            .values('created_by__worksite_id', 'status')
            .annotate(count=Count('id'))
        )
        
        # Organize status counts by worksite
        worksite_status_counts = defaultdict(dict)
        for item in request_status_by_worksite:
            worksite_id = item['created_by__worksite_id']
            status = item['status']
            count = item['count']
            worksite_status_counts[worksite_id][status] = count
        
        worksites_data = []
        for worksite in worksite_stats:
            worksites_data.append({
                'worksite_id': worksite['id'],
                'worksite_name': f"{worksite['city']}, {worksite['country']}",
                'total_users': worksite['total_users'],
                'active_users': worksite['active_users'],
                'inactive_users': worksite['total_users'] - worksite['active_users'],
                'total_requests': worksite['total_requests'],
                'requests_by_status': worksite_status_counts.get(worksite['id'], {})
            })
        
        serializer = WorksiteStatsSerializer(worksites_data, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='division-breakdown', url_name='division-breakdown')
    def division_breakdown(self, request):
        """Detailed breakdown of all divisions"""
        
        # Optimized: Division statistics with aggregation
        division_stats = Division.objects.annotate(
            total_users=Count('user', filter=Q(user__deleted_at__isnull=True), distinct=True),
            active_users=Count('user', filter=Q(user__deleted_at__isnull=True, user__is_active=True), distinct=True),
            total_requests=Count('user__created_requests')
        ).values('id', 'name', 'total_users', 'active_users', 'total_requests')
        
        # Get request status breakdown per division in one query
        request_status_by_division = (
            Request.objects
            .values('created_by__division_id', 'status')
            .annotate(count=Count('id'))
        )
        
        # Organize status counts by division
        division_status_counts = defaultdict(dict)
        for item in request_status_by_division:
            division_id = item['created_by__division_id']
            if division_id:  # Only count if user has a division
                status = item['status']
                count = item['count']
                division_status_counts[division_id][status] = count
        
        divisions_data = []
        for division in division_stats:
            divisions_data.append({
                'division_id': division['id'],
                'division_name': division['name'],
                'total_users': division['total_users'],
                'active_users': division['active_users'],
                'inactive_users': division['total_users'] - division['active_users'],
                'total_requests': division['total_requests'],
                'requests_by_status': division_status_counts.get(division['id'], {})
            })
        
        serializer = DivisionStatsSerializer(divisions_data, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='quick-overview', url_name='quick-overview')
    def quick_overview(self, request):
        """Quick overview stats for dashboard cards"""
        
        # Optimized: Single query for user stats
        user_stats = User.objects.filter(deleted_at__isnull=True).aggregate(
            total_users=Count('id'),
            active_users=Count('id', filter=Q(is_active=True))
        )
        
        # Optimized: Single query for request stats
        request_stats = Request.objects.aggregate(
            total_requests=Count('id'),
            pending_approvals=Count('id', filter=Q(status__in=['pending', 'in_review']))
        )
        
        return Response({
            'total_users': user_stats['total_users'],
            'active_users': user_stats['active_users'],
            'total_requests': request_stats['total_requests'],
            'pending_approvals': request_stats['pending_approvals'],
            'total_worksites': Worksite.objects.count(),
            'total_divisions': Division.objects.count(),
        })
