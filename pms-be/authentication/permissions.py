from rest_framework import permissions


class HasSpecificPermission(permissions.BasePermission):
    """
    Custom permission to check specific Django permission.
    Usage in views: permission_classes = [HasSpecificPermission('auth.add_user')]
    """
    def __init__(self, permission_codename):
        self.permission_codename = permission_codename

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.has_perm(self.permission_codename)


class CanCreateUser(permissions.BasePermission):
    """Permission to create users"""
    def has_permission(self, request, view):
        return request.user.has_perm('auth.add_user')


class CanViewUser(permissions.BasePermission):
    """Permission to view users"""
    def has_permission(self, request, view):
        return request.user.has_perm('auth.view_user')


class CanChangeUser(permissions.BasePermission):
    """Permission to modify users"""
    def has_permission(self, request, view):
        return request.user.has_perm('auth.change_user')


class CanDeleteUser(permissions.BasePermission):
    """Permission to delete users"""
    def has_permission(self, request, view):
        return request.user.has_perm('auth.delete_user')


class CanManageGroups(permissions.BasePermission):
    """Permission to manage user groups"""
    def has_permission(self, request, view):
        return request.user.has_perm('auth.change_group')


class CanViewAllRequests(permissions.BasePermission):
    """Permission to view all purchase requests in the system"""
    def has_permission(self, request, view):
        return request.user.has_perm('requests.view_all_requests')


class CanApproveRequests(permissions.BasePermission):
    """Permission to approve purchase requests"""
    def has_permission(self, request, view):
        return request.user.has_perm('requests.approve_request')


class CanViewPurchasingQueue(permissions.BasePermission):
    """Permission to view purchasing team queue"""
    def has_permission(self, request, view):
        return request.user.has_perm('requests.view_purchasing_queue')


class CanManageOrders(permissions.BasePermission):
    """Permission to mark orders as ordered/delivered"""
    def has_permission(self, request, view):
        return request.user.has_perm('requests.manage_orders')


# Convenience function to create permission class on the fly
def permission_required(permission_codename):
    """
    Factory function to create permission classes
    Usage: permission_classes = [permission_required('auth.add_user')]
    """
    class DynamicPermission(permissions.BasePermission):
        def has_permission(self, request, view):
            if not request.user or not request.user.is_authenticated:
                return False
            return request.user.has_perm(permission_codename)
    
    return DynamicPermission


# Method-based permissions (for different HTTP methods)
class MethodBasedPermissions(permissions.BasePermission):
    """
    Permission class that checks different permissions based on HTTP method
    Usage: Set permission_map in your view
    """
    permission_map = {
        'GET': None,      # No special permission needed for GET
        'POST': 'auth.add_user',
        'PUT': 'auth.change_user',
        'PATCH': 'auth.change_user', 
        'DELETE': 'auth.delete_user',
    }
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Get permission map from view if available
        permission_map = getattr(view, 'permission_map', self.permission_map)
        required_permission = permission_map.get(request.method)
        
        if required_permission is None:
            return True  # No specific permission required
            
        return request.user.has_perm(required_permission)


class ActionBasedPermissions(permissions.BasePermission):
    """
    Permission class for ViewSet actions
    Usage: Set action_permissions in your ViewSet
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Get action permissions from view
        action_permissions = getattr(view, 'action_permissions', {})
        required_permission = action_permissions.get(view.action)
        
        if required_permission is None:
            return True  # No specific permission required for this action
            
        return request.user.has_perm(required_permission)


class ObjectLevelPermission(permissions.BasePermission):
    """
    Permission class that checks both object-level and model-level permissions
    """
    
    def has_permission(self, request, view):
        # Basic authentication check
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Example: Users can only view/edit their own data unless they're staff
        if hasattr(obj, 'created_by') and obj.created_by == request.user:
            return True
            
        if hasattr(obj, 'supervisor') and obj.supervisor == request.user:
            return True
            
        # Staff can access everything
        return request.user.is_staff


class SupervisorPermission(permissions.BasePermission):
    """
    Permission for supervisors to manage their direct reports
    """
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
            
        # Check if user is supervisor of the object owner
        if hasattr(obj, 'created_by'):
            return obj.created_by.supervisor == request.user
            
        if hasattr(obj, 'user'):  # For password reset requests etc
            return obj.user.supervisor == request.user
            
        return False