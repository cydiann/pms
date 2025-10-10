from rest_framework import permissions
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType


class RequestPermissionMixin:
    """Mixin to add custom permissions to Request model"""
    
    @classmethod
    def create_custom_permissions(cls):
        """Create custom permissions for Request model"""
        from .models import Request
        
        content_type = ContentType.objects.get_for_model(Request)
        custom_permissions = [
            ('view_all_requests', 'Can view all purchase requests in system'),
            ('approve_request', 'Can approve purchase requests'),
            ('reject_request', 'Can reject purchase requests'),  
            ('request_revision', 'Can request revisions on purchase requests'),
            ('view_purchasing_queue', 'Can view purchasing team queue'),
            ('mark_ordered', 'Can mark requests as ordered'),
            ('mark_delivered', 'Can mark requests as delivered'),
            ('complete_request', 'Can mark requests as completed'),
            ('view_team_requests', 'Can view team members requests'),
            ('manage_own_requests', 'Can manage own requests'),
        ]
        
        for codename, name in custom_permissions:
            Permission.objects.get_or_create(
                codename=codename,
                content_type=content_type,
                defaults={'name': name}
            )


# Permission classes for specific actions
class CanViewAllRequests(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('requisition.view_all_requests')


class CanApproveRequests(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('requisition.approve_request')


class CanViewPurchasingQueue(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('requisition.view_purchasing_queue')


class CanMarkOrdered(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('requisition.mark_ordered')


class CanCompleteRequest(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('requisition.complete_request')


class RequestObjectPermission(permissions.BasePermission):
    """Object-level permissions for requests"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Superuser can do anything
        if user.is_superuser:
            return True
            
        # Users can always view/edit their own requests (if in draft)
        if obj.created_by == user:
            return True
            
        # Supervisors can approve requests from their direct reports
        if hasattr(obj, 'created_by') and obj.created_by.supervisor == user:
            if view.action in ['approve', 'reject', 'request_revision']:
                return user.has_perm('requisition.approve_request')
                
        # Purchasing team can handle approved requests
        if obj.status == 'approved' and view.action in ['mark_ordered', 'mark_delivered', 'complete']:
            return user.has_perm('requisition.view_purchasing_queue')
            
        return False


class SupervisorRequestPermission(permissions.BasePermission):
    """Permission for supervisors to manage their team's requests"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Check if user is in the approval chain
        approval_chain = obj.get_approval_chain()
        if user in approval_chain:
            return user.has_perm('requisition.approve_request')
            
        return False


# Action-based permission class for RequestViewSet
class RequestActionPermissions(permissions.BasePermission):
    """
    Permission class that checks different permissions based on ViewSet action
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
            
        user = request.user
        action = view.action
        
        # Define permission requirements for each action
        action_permissions = {
            'list': 'requisition.view_request',  # Can list own requests
            'retrieve': 'requisition.view_request',
            'create': 'requisition.add_request',
            'update': 'requisition.change_request',
            'partial_update': 'requisition.change_request',
            'destroy': 'requisition.delete_request',
            'submit': 'requisition.add_request',  # Same as create
            'approve': 'requisition.approve_request',
            'reject': 'requisition.reject_request',
            'request_revision': 'requisition.request_revision',
            'mark_ordered': 'requisition.mark_ordered',
            'mark_delivered': 'requisition.mark_delivered',
            'complete': 'requisition.complete_request',
            'history': 'requisition.view_request',
            'admin_stats': 'requisition.view_all_requests',
            'purchasing_queue': 'requisition.view_purchasing_queue',
        }
        
        required_permission = action_permissions.get(action)
        if required_permission is None:
            return True  # No specific permission required
            
        return user.has_perm(required_permission)


# Convenience functions to create default groups with permissions
def create_request_permissions():
    """Create all custom request permissions"""
    RequestPermissionMixin.create_custom_permissions()


def setup_default_request_groups():
    """Set up default groups with request permissions"""
    from django.contrib.auth.models import Group
    
    # Ensure custom permissions exist
    create_request_permissions()
    
    # Employee Group - Can create and manage own requests
    employee_group, created = Group.objects.get_or_create(name='Employee')
    if created or not employee_group.permissions.exists():
        employee_permissions = [
            'requisition.add_request',
            'requisition.view_request', 
            'requisition.change_request',
            'requisition.manage_own_requests',
        ]
        for perm_codename in employee_permissions:
            try:
                permission = Permission.objects.get(codename=perm_codename.split('.')[-1])
                employee_group.permissions.add(permission)
            except Permission.DoesNotExist:
                pass
    
    # Supervisor Group - Can approve requests
    supervisor_group, created = Group.objects.get_or_create(name='Supervisor')
    if created or not supervisor_group.permissions.filter(codename='approve_request').exists():
        supervisor_permissions = [
            'requisition.add_request',
            'requisition.view_request',
            'requisition.approve_request',
            'requisition.reject_request', 
            'requisition.request_revision',
            'requisition.view_team_requests',
        ]
        for perm_codename in supervisor_permissions:
            try:
                permission = Permission.objects.get(codename=perm_codename.split('.')[-1])
                supervisor_group.permissions.add(permission)
            except Permission.DoesNotExist:
                pass
    
    # Purchasing Team - Can handle approved requests
    purchasing_group, created = Group.objects.get_or_create(name='Purchasing Team')
    if created or not purchasing_group.permissions.filter(codename='view_purchasing_queue').exists():
        purchasing_permissions = [
            'requisition.view_purchasing_queue',
            'requisition.mark_ordered',
            'requisition.mark_delivered', 
            'requisition.complete_request',
            'requisition.reject_request',
            'requisition.request_revision',
        ]
        for perm_codename in purchasing_permissions:
            try:
                permission = Permission.objects.get(codename=perm_codename.split('.')[-1])
                purchasing_group.permissions.add(permission)
            except Permission.DoesNotExist:
                pass
    
    # Admin Group - Full access
    admin_group, created = Group.objects.get_or_create(name='Administrator') 
    if created or not admin_group.permissions.filter(codename='view_all_requests').exists():
        # Add all request permissions to admin group
        all_request_permissions = Permission.objects.filter(content_type__model='request')
        admin_group.permissions.add(*all_request_permissions)
