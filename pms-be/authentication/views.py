from django.shortcuts import get_object_or_404
from django.contrib.auth.models import Group, Permission
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

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser], url_path='remove-supervisor', url_name='remove-supervisor')
    def remove_supervisor(self, request, pk=None):
        """Remove supervisor from user (promotes to top level)"""
        user = self.get_object()

        # Store current supervisor for response
        old_supervisor = user.supervisor
        old_supervisor_info = {
            'id': old_supervisor.id if old_supervisor else None,
            'username': old_supervisor.username if old_supervisor else None,
            'full_name': old_supervisor.get_full_name() if old_supervisor else None,
        } if old_supervisor else None

        # Remove supervisor
        try:
            result = user.remove_supervisor()

            if result:
                return Response({
                    'message': f'Supervisor removed from {user.get_full_name()}',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'full_name': user.get_full_name(),
                    },
                    'old_supervisor': old_supervisor_info,
                    'new_supervisor': None
                })
            else:
                return Response({
                    'message': f'{user.get_full_name()} had no supervisor to remove',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'full_name': user.get_full_name(),
                    },
                    'old_supervisor': None,
                    'new_supervisor': None
                })
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser], url_path='change-supervisor', url_name='change-supervisor')
    def change_supervisor(self, request, pk=None):
        """Change or remove supervisor for user"""
        user = self.get_object()
        new_supervisor_id = request.data.get('supervisor_id')

        # Store current supervisor for response
        old_supervisor = user.supervisor
        old_supervisor_info = {
            'id': old_supervisor.id if old_supervisor else None,
            'username': old_supervisor.username if old_supervisor else None,
            'full_name': old_supervisor.get_full_name() if old_supervisor else None,
        } if old_supervisor else None

        # Get new supervisor (None if supervisor_id is None)
        new_supervisor = None
        if new_supervisor_id is not None:
            try:
                new_supervisor = User.objects.get(id=new_supervisor_id, deleted_at__isnull=True)
            except User.DoesNotExist:
                return Response(
                    {'error': f'Supervisor with ID {new_supervisor_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Change supervisor
        try:
            result = user.change_supervisor(new_supervisor)

            new_supervisor_info = {
                'id': new_supervisor.id if new_supervisor else None,
                'username': new_supervisor.username if new_supervisor else None,
                'full_name': new_supervisor.get_full_name() if new_supervisor else None,
            } if new_supervisor else None

            if result:
                if new_supervisor:
                    message = f'Changed supervisor for {user.get_full_name()} to {new_supervisor.get_full_name()}'
                else:
                    message = f'Removed supervisor from {user.get_full_name()}'
            else:
                message = f'No change needed for {user.get_full_name()}'

            return Response({
                'message': message,
                'changed': result,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'full_name': user.get_full_name(),
                },
                'old_supervisor': old_supervisor_info,
                'new_supervisor': new_supervisor_info
            })
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'], url_path='hierarchy-chain', url_name='hierarchy-chain')
    def hierarchy_chain(self, request, pk=None):
        """Get user's full hierarchy chain from themselves up to the top level"""
        user = self.get_object()

        try:
            hierarchy = user.get_hierarchy_chain()

            hierarchy_data = []
            for i, person in enumerate(hierarchy):
                hierarchy_data.append({
                    'level': i,
                    'id': person.id,
                    'username': person.username,
                    'full_name': person.get_full_name(),
                    'first_name': person.first_name,
                    'last_name': person.last_name,
                    'is_user': person.id == user.id,
                    'is_top_level': i == len(hierarchy) - 1,
                    'worksite': {
                        'city': person.worksite.city,
                        'country': person.worksite.country
                    } if person.worksite else None
                })

            return Response({
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'full_name': user.get_full_name(),
                },
                'hierarchy_levels': len(hierarchy),
                'hierarchy': hierarchy_data,
                'direct_supervisor': {
                    'id': user.supervisor.id,
                    'username': user.supervisor.username,
                    'full_name': user.supervisor.get_full_name(),
                } if user.supervisor else None
            })
        except Exception as e:
            return Response(
                {'error': f'Error retrieving hierarchy: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
