from django.contrib import admin
from .models import Request, ApprovalHistory, AuditLog, RequestRevision


@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
    list_display = ['request_number', 'item', 'created_by', 'status', 'quantity', 'unit', 'created_at']
    list_filter = ['status', 'unit', 'category', 'created_at']
    search_fields = ['request_number', 'item', 'created_by__username']
    readonly_fields = ['request_number', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('request_number', 'item', 'description', 'created_by')
        }),
        ('Request Details', {
            'fields': ('quantity', 'unit', 'category', 'delivery_address', 'reason')
        }),
        ('Status', {
            'fields': ('status', 'latest_approval')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(ApprovalHistory)
class ApprovalHistoryAdmin(admin.ModelAdmin):
    list_display = ['request', 'user', 'action', 'level', 'created_at']
    list_filter = ['action', 'level', 'created_at']
    search_fields = ['request__request_number', 'user__username']
    readonly_fields = ['created_at']


@admin.register(RequestRevision)
class RequestRevisionAdmin(admin.ModelAdmin):
    list_display = ['request', 'revision_number', 'requested_by', 'revised_by', 'created_at']
    list_filter = ['revision_number', 'created_at']
    search_fields = ['request__request_number', 'requested_by__username']
    readonly_fields = ['created_at', 'revised_at']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'table_name', 'action', 'record_id', 'timestamp']
    list_filter = ['table_name', 'action', 'timestamp']
    search_fields = ['user__username', 'table_name']
    readonly_fields = ['timestamp']
