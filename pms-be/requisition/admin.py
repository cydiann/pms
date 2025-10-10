from django.contrib import admin
from .models import Request, ApprovalHistory, AuditLog, RequestRevision, RequestArchive


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


@admin.register(RequestArchive)
class RequestArchiveAdmin(admin.ModelAdmin):
    list_display = ['id', 'archive_date', 'period_start', 'period_end', 'request_count', 'file_size_mb', 'downloaded', 'downloaded_by']
    list_filter = ['downloaded', 'archive_date']
    search_fields = ['archived_request_numbers']
    readonly_fields = ['id', 'archive_date', 'file_path', 'file_size', 'request_count', 'archived_request_ids', 'archived_request_numbers', 'downloaded', 'downloaded_at', 'downloaded_by', 'created_at']

    def file_size_mb(self, obj):
        """Display file size in MB"""
        return f"{obj.file_size / 1024 / 1024:.2f} MB"
    file_size_mb.short_description = 'File Size'

    fieldsets = (
        ('Archive Period', {
            'fields': ('archive_date', 'period_start', 'period_end')
        }),
        ('Archive Details', {
            'fields': ('file_path', 'file_size', 'request_count', 'archived_request_numbers')
        }),
        ('Download Status', {
            'fields': ('downloaded', 'downloaded_at', 'downloaded_by')
        }),
        ('Metadata', {
            'fields': ('created_at',)
        }),
    )
