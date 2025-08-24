import django_filters
from .models import Worksite, Division


class WorksiteFilter(django_filters.FilterSet):
    city = django_filters.CharFilter(lookup_expr='icontains')
    country = django_filters.CharFilter(lookup_expr='icontains')
    chief = django_filters.NumberFilter(field_name='chief__id')
    chief_username = django_filters.CharFilter(field_name='chief__username', lookup_expr='icontains')
    chief__first_name = django_filters.CharFilter(field_name='chief__first_name', lookup_expr='icontains')
    chief__last_name = django_filters.CharFilter(field_name='chief__last_name', lookup_expr='icontains')
    has_chief = django_filters.BooleanFilter(method='filter_has_chief')
    
    class Meta:
        model = Worksite
        fields = {
            'address': ['icontains'],
            'city': ['exact', 'icontains'],
            'country': ['exact', 'icontains'],
        }
    
    def filter_has_chief(self, queryset, name, value):
        if value is True:
            return queryset.filter(chief__isnull=False)
        elif value is False:
            return queryset.filter(chief__isnull=True)
        return queryset


class DivisionFilter(django_filters.FilterSet):
    created_by = django_filters.NumberFilter(field_name='created_by__id')
    created_by_username = django_filters.CharFilter(field_name='created_by__username', lookup_expr='icontains')
    created_by_first_name = django_filters.CharFilter(field_name='created_by__first_name', lookup_expr='icontains')
    created_by_last_name = django_filters.CharFilter(field_name='created_by__last_name', lookup_expr='icontains')
    worksite = django_filters.NumberFilter(field_name='worksites__id')
    worksite_name = django_filters.CharFilter(field_name='worksites__name', lookup_expr='icontains')
    worksite_city = django_filters.CharFilter(field_name='worksites__city', lookup_expr='icontains')
    has_worksites = django_filters.BooleanFilter(method='filter_has_worksites')
    
    class Meta:
        model = Division
        fields = {
            'name': ['exact', 'icontains'],
        }
    
    def filter_has_worksites(self, queryset, name, value):
        if value is True:
            return queryset.filter(worksites__isnull=False).distinct()
        elif value is False:
            return queryset.filter(worksites__isnull=True)
        return queryset