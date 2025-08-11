from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, PasswordResetRequest


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'get_full_name', 'get_role_name', 'supervisor', 'worksite', 'is_active', 'created_at']
    list_filter = ['is_active', 'is_staff', 'groups', 'worksite', 'created_at']
    search_fields = ['username', 'first_name', 'last_name']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('supervisor', 'worksite', 'deleted_at')
        }),
    )
    
    def get_role_name(self, obj):
        return obj.get_role_name()
    get_role_name.short_description = 'Role'


@admin.register(PasswordResetRequest)
class PasswordResetRequestAdmin(admin.ModelAdmin):
    list_display = ['user', 'supervisor', 'status', 'created_at', 'processed_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__username', 'supervisor__username']
    readonly_fields = ['created_at', 'processed_at']
