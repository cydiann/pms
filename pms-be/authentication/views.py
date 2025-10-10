from django.shortcuts import get_object_or_404
from django.contrib.auth.models import Group, Permission
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import User
from .serializers import UserSerializer
from .filters import UserFilter
from .permissions import (
    CanCreateUser, CanChangeUser, CanDeleteUser, CanManageGroups,
    ActionBasedPermissions, MethodBasedPermissions, permission_required
)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(deleted_at__isnull=True)
    serializer_class = UserSerializer
    permission_classes = [ActionBasedPermissions]
    filterset_class = UserFilter
    search_fields = ['username', 'first_name', 'last_name', 'worksite__city', 'supervisor__username', 'supervisor__first_name', 'supervisor__last_name']
    ordering_fields = ['username', 'first_name', 'last_name', 'date_joined', 'created_at', 'is_active', 'is_staff']
    ordering = ['first_name', 'last_name']
    
    # Define permissions for each action
    action_permissions = {
        'list': 'auth.view_user',
        # 'retrieve', 'update', 'partial_update' allow all authenticated users (queryset filtering + object permissions handle access)
        'create': 'auth.add_user',
        'destroy': 'auth.delete_user',
        'manage_groups': 'auth.change_group',
        'manage_permissions': 'auth.change_permission',
        'view_as': 'auth.view_user',
        'available_permissions': 'auth.view_permission',
        'stats': 'auth.view_user',
        # 'me' and 'my_permissions' don't need special permissions - all authenticated users can access
    }
    
    def get_queryset(self):
        # Users can only see themselves unless they have view_user permission
        if self.request.user.has_perm('auth.view_user'):
            return User.objects.filter(deleted_at__isnull=True)
        return User.objects.filter(id=self.request.user.id)
    
    def get_permissions(self):
        # Special case for 'me' and 'my_permissions' actions - only need authentication
        if self.action in ['me', 'my_permissions']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()
    
    @action(detail=False, methods=['get'], url_path='me', url_name='me')
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='my-permissions', url_name='my-permissions')
    def my_permissions(self, request):
        """Get current user's permissions"""
        user = request.user
        user_permissions = user.get_all_permissions()
        
        return Response({
            'is_superuser': user.is_superuser,
            'groups': [{'id': g.id, 'name': g.name} for g in user.groups.all()],
            'permissions': list(user_permissions)
        })
    
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAdminUser], url_path='view-as', url_name='view-as')
    def view_as(self, request, pk=None):
        target_user = self.get_object()
        serializer = self.get_serializer(target_user)
        
        return Response({
            'user': serializer.data,
            'permissions': list(target_user.get_all_permissions()),
            'groups': [{'id': g.id, 'name': g.name} for g in target_user.groups.all()],
            'is_superuser': target_user.is_superuser
        })
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser], url_path='manage-groups', url_name='manage-groups')
    def manage_groups(self, request, pk=None):
        """Add/remove user from groups"""
        user = self.get_object()
        action_type = request.data.get('action')  # 'add' or 'remove'
        group_ids = request.data.get('group_ids', [])
        
        if action_type == 'add':
            groups = Group.objects.filter(id__in=group_ids)
            user.groups.add(*groups)
            message = f"Added user to {len(groups)} groups"
        elif action_type == 'remove':
            groups = Group.objects.filter(id__in=group_ids)
            user.groups.remove(*groups)
            message = f"Removed user from {len(groups)} groups"
        elif action_type == 'set':
            # Replace all groups
            user.groups.set(Group.objects.filter(id__in=group_ids))
            message = f"Set user groups to {len(group_ids)} groups"
        else:
            return Response({'error': 'Invalid action. Use add, remove, or set'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'message': message,
            'groups': [{'id': g.id, 'name': g.name} for g in user.groups.all()]
        })
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser], url_path='manage-permissions', url_name='manage-permissions')
    def manage_permissions(self, request, pk=None):
        """Add/remove individual permissions for user"""
        user = self.get_object()
        action_type = request.data.get('action')  # 'add' or 'remove'
        permission_ids = request.data.get('permission_ids', [])
        
        if action_type == 'add':
            perms = Permission.objects.filter(id__in=permission_ids)
            user.user_permissions.add(*perms)
            message = f"Added {len(perms)} permissions to user"
        elif action_type == 'remove':
            perms = Permission.objects.filter(id__in=permission_ids)
            user.user_permissions.remove(*perms)
            message = f"Removed {len(perms)} permissions from user"
        elif action_type == 'set':
            user.user_permissions.set(Permission.objects.filter(id__in=permission_ids))
            message = f"Set user permissions to {len(permission_ids)} permissions"
        else:
            return Response({'error': 'Invalid action. Use add, remove, or set'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'message': message,
            'user_permissions': [{'id': p.id, 'name': p.name, 'codename': p.codename} 
                               for p in user.user_permissions.all()]
        })

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[permissions.IsAdminUser],
        url_path='stats',
        url_name='stats'
    )
    def stats(self, request):
        """Aggregate user statistics for admin dashboard"""
        user_qs = User.objects.filter(deleted_at__isnull=True)

        total_users = user_qs.count()
        active_users = user_qs.filter(is_active=True).count()
        admin_users = user_qs.filter(is_superuser=True).count()
        users_with_subordinates = user_qs.filter(
            direct_reports__deleted_at__isnull=True
        ).distinct().count()

        worksite_counts = user_qs.filter(
            worksite__isnull=False
        ).values(
            'worksite__city',
            'worksite__country'
        ).annotate(count=Count('id'))

        users_by_worksite = {}
        for item in worksite_counts:
            city = item['worksite__city'] or 'Unknown'
            country = item['worksite__country'] or 'Unknown'
            key = f"{city}, {country}"
            users_by_worksite[key] = item['count']

        recent_threshold = timezone.now() - timedelta(days=30)
        new_users_this_month = user_qs.filter(created_at__gte=recent_threshold).count()

        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': total_users - active_users,
            'admin_users': admin_users,
            'users_with_subordinates': users_with_subordinates,
            'users_by_worksite': users_by_worksite,
            'new_users_this_month': new_users_this_month,
        })
    
    @action(detail=False, methods=['get'], url_path='by-group', url_name='by-group')
    def by_group(self, request):
        """List users filtered by group"""
        group_id = request.query_params.get('group_id')
        group_name = request.query_params.get('group_name')
        
        if not group_id and not group_name:
            return Response(
                {'error': 'Either group_id or group_name parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            if group_id:
                group = Group.objects.get(id=group_id)
            else:
                group = Group.objects.get(name=group_name)
        except Group.DoesNotExist:
            return Response(
                {'error': 'Group not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        users = User.objects.filter(groups=group, deleted_at__isnull=True)
        serializer = self.get_serializer(users, many=True)
        
        return Response({
            'group': {'id': group.id, 'name': group.name},
            'user_count': users.count(),
            'users': serializer.data
        })
    
    @action(detail=False, methods=['get'], url_path='available_permissions', url_name='available-permissions')
    def available_permissions(self, request):
        """Get all available permissions with content type and app label info"""
        permissions_qs = Permission.objects.all().select_related('content_type')
        
        return Response([{
            'id': perm.id,
            'name': perm.name,
            'codename': perm.codename,
            'content_type': perm.content_type.model,
            'app_label': perm.content_type.app_label
        } for perm in permissions_qs])


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    permission_classes = [permissions.IsAdminUser]
    
    def list(self, request):
        groups = Group.objects.all()
        return Response([{
            'id': group.id,
            'name': group.name,
            'user_count': group.user_set.count(),
            'permissions': [{'id': p.id, 'name': p.name, 'codename': p.codename} 
                          for p in group.permissions.all()]
        } for group in groups])
    
    def retrieve(self, request, pk=None):
        group = self.get_object()
        return Response({
            'id': group.id,
            'name': group.name,
            'users': [{'id': u.id, 'username': u.username, 'full_name': u.get_full_name()} 
                     for u in group.user_set.all()],
            'permissions': [{'id': p.id, 'name': p.name, 'codename': p.codename} 
                          for p in group.permissions.all()]
        })
    
    @action(detail=True, methods=['post'], url_path='manage-permissions', url_name='manage-permissions')
    def manage_permissions(self, request, pk=None):
        """Add/remove permissions from group"""
        group = self.get_object()
        action_type = request.data.get('action')  # 'add', 'remove', 'set'
        permission_ids = request.data.get('permission_ids', [])
        
        if action_type == 'add':
            perms = Permission.objects.filter(id__in=permission_ids)
            group.permissions.add(*perms)
            message = f"Added {len(perms)} permissions to group"
        elif action_type == 'remove':
            perms = Permission.objects.filter(id__in=permission_ids)
            group.permissions.remove(*perms)
            message = f"Removed {len(perms)} permissions from group"
        elif action_type == 'set':
            group.permissions.set(Permission.objects.filter(id__in=permission_ids))
            message = f"Set group permissions to {len(permission_ids)} permissions"
        else:
            return Response({'error': 'Invalid action. Use add, remove, or set'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'message': message,
            'permissions': [{'id': p.id, 'name': p.name, 'codename': p.codename} 
                          for p in group.permissions.all()]
        })


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    permission_classes = [permissions.IsAdminUser]
    
    def list(self, request):
        permissions = Permission.objects.all().select_related('content_type')
        return Response([{
            'id': perm.id,
            'name': perm.name,
            'codename': perm.codename,
            'content_type': perm.content_type.model
        } for perm in permissions])
    
    @action(detail=False, methods=['get'], url_path='by-content-type', url_name='by-content-type')
    def by_content_type(self, request):
        """Group permissions by content type"""
        permissions = Permission.objects.all().select_related('content_type')
        grouped = {}
        
        for perm in permissions:
            content_type = perm.content_type.model
            if content_type not in grouped:
                grouped[content_type] = []
            
            grouped[content_type].append({
                'id': perm.id,
                'name': perm.name,
                'codename': perm.codename
            })
        
        return Response(grouped)
