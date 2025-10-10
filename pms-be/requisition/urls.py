from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RequestViewSet, ApprovalHistoryViewSet, AuditLogViewSet,
    ProcurementDocumentViewSet, RequestArchiveViewSet
)

router = DefaultRouter()
router.register(r'documents', ProcurementDocumentViewSet, basename='document')
router.register(r'approval-history', ApprovalHistoryViewSet, basename='approvalhistory')
router.register(r'admin/archives', RequestArchiveViewSet, basename='archive')
router.register(r'admin/audit-logs', AuditLogViewSet, basename='auditlog')
router.register(r'', RequestViewSet, basename='request')

urlpatterns = [
    path('', include(router.urls)),
    # Admin stats endpoint (alias for easier access)
    path('admin/stats/', AuditLogViewSet.as_view({'get': 'stats'}), name='admin_stats'),
]