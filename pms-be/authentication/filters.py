import django_filters
from django.db import models
from .models import User


class UserFilter(django_filters.FilterSet):
    worksite = django_filters.NumberFilter(field_name='worksite__id')
    worksite_name = django_filters.CharFilter(field_name='worksite__name', lookup_expr='icontains')
    supervisor = django_filters.NumberFilter(field_name='supervisor__id')
    supervisor_username = django_filters.CharFilter(field_name='supervisor__username', lookup_expr='icontains')
    
    # Boolean filters
    is_active = django_filters.BooleanFilter()
    is_staff = django_filters.BooleanFilter()
    is_superuser = django_filters.BooleanFilter()
    has_supervisor = django_filters.BooleanFilter(method='filter_has_supervisor')
    
    # Date filters
    joined_after = django_filters.DateFilter(field_name='date_joined', lookup_expr='gte')
    joined_before = django_filters.DateFilter(field_name='date_joined', lookup_expr='lte')
    created_after = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    
    # Group filters
    in_group = django_filters.CharFilter(field_name='groups__name', lookup_expr='icontains')
    group_id = django_filters.NumberFilter(field_name='groups__id')
    
    class Meta:
        model = User
        fields = {
            'username': ['exact', 'icontains'],
            'first_name': ['exact', 'icontains'],
            'last_name': ['exact', 'icontains'],
            'email': ['exact', 'icontains'],
            'is_active': ['exact'],
            'is_staff': ['exact'],
            'is_superuser': ['exact'],
            'date_joined': ['exact', 'gte', 'lte'],
            'created_at': ['exact', 'gte', 'lte'],
        }
    
    def filter_has_supervisor(self, queryset, name, value):
        if value is True:
            return queryset.filter(supervisor__isnull=False)
        elif value is False:
            return queryset.filter(supervisor__isnull=True)
        return queryset