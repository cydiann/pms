import django_filters
from django.db import models
from .models import Request, ApprovalHistory, AuditLog


class RequestFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=Request.STATUS_CHOICES)
    category = django_filters.CharFilter(lookup_expr='icontains')
    created_by = django_filters.NumberFilter(field_name='created_by__id')
    created_by_username = django_filters.CharFilter(field_name='created_by__username', lookup_expr='icontains')
    created_by_user_first_name = django_filters.CharFilter(field_name='created_by__first_name', lookup_expr='icontains')
    created_by_user_last_name = django_filters.CharFilter(field_name='created_by__last_name', lookup_expr='icontains')
    worksite = django_filters.NumberFilter(field_name='created_by__worksite__id')
    division = django_filters.NumberFilter(field_name='created_by__division__id')
    
    # Date filters
    created_after = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    submitted_after = django_filters.DateFilter(field_name='submitted_at', lookup_expr='gte')
    submitted_before = django_filters.DateFilter(field_name='submitted_at', lookup_expr='lte')
    
    # Quantity filters
    min_quantity = django_filters.NumberFilter(field_name='quantity', lookup_expr='gte')
    max_quantity = django_filters.NumberFilter(field_name='quantity', lookup_expr='lte')
    
    # Unit filter
    unit = django_filters.ChoiceFilter(choices=Request.UNIT_CHOICES)
    
    class Meta:
        model = Request
        fields = {
            'status': ['exact'],
            'category': ['exact', 'icontains'],
            'item': ['icontains'],
            'description': ['icontains'],
            'quantity': ['exact', 'gte', 'lte'],
            'unit': ['exact'],
            'revision_count': ['exact', 'gte', 'lte'],
            'created_at': ['exact', 'gte', 'lte'],
            'submitted_at': ['exact', 'gte', 'lte'],
        }
    


class ApprovalHistoryFilter(django_filters.FilterSet):
    request_id = django_filters.NumberFilter(field_name='request__id')
    user = django_filters.NumberFilter(field_name='user__id')
    user_username = django_filters.CharFilter(field_name='user__username', lookup_expr='icontains')
    user_first_name = django_filters.CharFilter(field_name='user__first_name', lookup_expr='icontains')
    user_last_name = django_filters.CharFilter(field_name='user__last_name', lookup_expr='icontains')
    action = django_filters.ChoiceFilter(choices=ApprovalHistory.ACTION_CHOICES)
    level = django_filters.NumberFilter()
    
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    class Meta:
        model = ApprovalHistory
        fields = {
            'action': ['exact'],
            'level': ['exact', 'gte', 'lte'],
            'created_at': ['exact', 'gte', 'lte'],
        }


class AuditLogFilter(django_filters.FilterSet):
    request_id = django_filters.NumberFilter(field_name='request__id')
    user = django_filters.NumberFilter(field_name='user__id')
    user_username = django_filters.CharFilter(field_name='user__username', lookup_expr='icontains')
    user_first_name = django_filters.CharFilter(field_name='user__first_name', lookup_expr='icontains')
    user_last_name = django_filters.CharFilter(field_name='user__last_name', lookup_expr='icontains')
    action = django_filters.CharFilter(lookup_expr='icontains')
    
    timestamp_after = django_filters.DateTimeFilter(field_name='timestamp', lookup_expr='gte')
    timestamp_before = django_filters.DateTimeFilter(field_name='timestamp', lookup_expr='lte')
    
    class Meta:
        model = AuditLog
        fields = {
            'action': ['exact', 'icontains'],
            'timestamp': ['exact', 'gte', 'lte'],
        }