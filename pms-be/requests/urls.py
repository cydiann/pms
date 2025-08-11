from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RequestViewSet, ApprovalHistoryViewSet, AuditLogViewSet

router = DefaultRouter()
router.register(r'', RequestViewSet, basename='request')
router.register(r'approval-history', ApprovalHistoryViewSet)
router.register(r'admin/audit-logs', AuditLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # Admin stats endpoint (alias for easier access)
    path('admin/stats/', AuditLogViewSet.as_view({'get': 'stats'}), name='admin_stats'),
]