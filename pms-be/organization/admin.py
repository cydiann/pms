from django.contrib import admin
from .models import Worksite, Division


@admin.register(Worksite)
class WorksiteAdmin(admin.ModelAdmin):
    list_display = ['city', 'country', 'chief', 'address']
    list_filter = ['country', 'city']
    search_fields = ['city', 'address']


@admin.register(Division)
class DivisionAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_by']
    filter_horizontal = ['worksites']
    search_fields = ['name']
