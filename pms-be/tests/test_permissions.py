"""
Permission system tests for PMS system
Tests Django groups, permissions, and access control
"""
from django.test import TestCase
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from rest_framework.test import APIClient
from rest_framework import status

from authentication.models import User
from requests.models import Request
from organization.models import Worksite


class PermissionSystemTests(TestCase):
    """Test the permission system functionality"""
    
    def setUp(self):
        """Set up test users and groups"""
        self.client = APIClient()
        
        # Create worksite
        self.worksite = Worksite.objects.create(
            address="Permission Test Site",
            city="Test City",
            country="USA"
        )
        
        # Create users
        self.admin = User.objects.create_superuser(
            username="admin",
            password="admin123"
        )
        
        self.employee = User.objects.create_user(
            username="employee",
            password="emp123",
            worksite=self.worksite
        )
        
        self.supervisor = User.objects.create_user(
            username="supervisor", 
            password="super123",
            worksite=self.worksite
        )
        
        self.purchasing = User.objects.create_user(
            username="purchasing",
            password="pur123",
            worksite=self.worksite
        )
        
        # Create groups
        self.employee_group = Group.objects.create(name="Employee")
        self.supervisor_group = Group.objects.create(name="Supervisor")
        self.purchasing_group = Group.objects.create(name="Purchasing Team")
        self.admin_group = Group.objects.create(name="Administrator")
        
        # Assign users to groups
        self.employee.groups.add(self.employee_group)
        self.supervisor.groups.add(self.supervisor_group)
        self.purchasing.groups.add(self.purchasing_group)
        
        # Set up permissions
        self.setup_permissions()
        
    def setup_permissions(self):
        """Set up permissions for groups"""
        # Get request permissions
        request_ct = ContentType.objects.get_for_model(Request)
        
        view_request = Permission.objects.get(codename='view_request', content_type=request_ct)
        add_request = Permission.objects.get(codename='add_request', content_type=request_ct)
        change_request = Permission.objects.get(codename='change_request', content_type=request_ct)
        delete_request = Permission.objects.get(codename='delete_request', content_type=request_ct)
        
        # Create custom permissions
        approve_request, created = Permission.objects.get_or_create(
            codename='approve_request',
            content_type=request_ct,
            defaults={'name': 'Can approve requests'}
        )
        
        view_purchasing_queue, created = Permission.objects.get_or_create(
            codename='view_purchasing_queue',
            content_type=request_ct,
            defaults={'name': 'Can view purchasing queue'}
        )
        
        # Assign permissions to groups
        # Employee: basic CRUD on own requests
        self.employee_group.permissions.add(view_request, add_request, change_request)
        
        # Supervisor: employee permissions + approval
        self.supervisor_group.permissions.add(view_request, add_request, change_request, approve_request)
        
        # Purchasing: view and manage orders
        self.purchasing_group.permissions.add(view_request, change_request, view_purchasing_queue)
        
        # Admin: everything
        self.admin_group.permissions.add(view_request, add_request, change_request, delete_request, approve_request, view_purchasing_queue)
        
    def test_superuser_has_all_permissions(self):
        """Test superuser has all permissions regardless of groups"""
        self.assertTrue(self.admin.has_perm('requests.view_request'))
        self.assertTrue(self.admin.has_perm('requests.add_request'))
        self.assertTrue(self.admin.has_perm('requests.change_request'))
        self.assertTrue(self.admin.has_perm('requests.delete_request'))
        self.assertTrue(self.admin.has_perm('requests.approve_request'))
        
    def test_employee_permissions(self):
        """Test employee has correct permissions"""
        self.assertTrue(self.employee.has_perm('requests.view_request'))
        self.assertTrue(self.employee.has_perm('requests.add_request'))
        self.assertTrue(self.employee.has_perm('requests.change_request'))
        self.assertFalse(self.employee.has_perm('requests.delete_request'))
        self.assertFalse(self.employee.has_perm('requests.approve_request'))
        self.assertFalse(self.employee.has_perm('requests.view_purchasing_queue'))
        
    def test_supervisor_permissions(self):
        """Test supervisor has correct permissions"""
        self.assertTrue(self.supervisor.has_perm('requests.view_request'))
        self.assertTrue(self.supervisor.has_perm('requests.add_request'))
        self.assertTrue(self.supervisor.has_perm('requests.change_request'))
        self.assertTrue(self.supervisor.has_perm('requests.approve_request'))
        self.assertFalse(self.supervisor.has_perm('requests.delete_request'))
        self.assertFalse(self.supervisor.has_perm('requests.view_purchasing_queue'))
        
    def test_purchasing_permissions(self):
        """Test purchasing team has correct permissions"""
        self.assertTrue(self.purchasing.has_perm('requests.view_request'))
        self.assertTrue(self.purchasing.has_perm('requests.change_request'))
        self.assertTrue(self.purchasing.has_perm('requests.view_purchasing_queue'))
        self.assertFalse(self.purchasing.has_perm('requests.add_request'))
        self.assertFalse(self.purchasing.has_perm('requests.approve_request'))
        self.assertFalse(self.purchasing.has_perm('requests.delete_request'))
        
    def test_multiple_group_permissions(self):
        """Test user with multiple groups gets combined permissions"""
        # Add employee to supervisor group as well
        self.employee.groups.add(self.supervisor_group)
        
        # Should now have both employee and supervisor permissions
        self.assertTrue(self.employee.has_perm('requests.view_request'))
        self.assertTrue(self.employee.has_perm('requests.add_request'))
        self.assertTrue(self.employee.has_perm('requests.change_request'))
        self.assertTrue(self.employee.has_perm('requests.approve_request'))  # From supervisor group
        self.assertFalse(self.employee.has_perm('requests.delete_request'))
        
    def test_individual_permission_assignment(self):
        """Test assigning individual permissions to user"""
        # Give employee individual delete permission
        delete_perm = Permission.objects.get(codename='delete_request')
        self.employee.user_permissions.add(delete_perm)
        
        # Should now have delete permission even though group doesn't
        self.assertTrue(self.employee.has_perm('requests.delete_request'))
        
    def test_permission_inheritance_hierarchy(self):
        """Test permission resolution hierarchy: superuser > individual > group"""
        # Create a regular user
        regular_user = User.objects.create_user(
            username="regular",
            password="regular123"
        )
        
        # No permissions initially
        self.assertFalse(regular_user.has_perm('requests.view_request'))
        
        # Add to group with permission
        regular_user.groups.add(self.employee_group)
        self.assertTrue(regular_user.has_perm('requests.view_request'))
        
        # Remove individual permission (should still have through group)
        view_perm = Permission.objects.get(codename='view_request')
        regular_user.user_permissions.remove(view_perm)
        self.assertTrue(regular_user.has_perm('requests.view_request'))  # Still has through group
        
        # Remove from group
        regular_user.groups.remove(self.employee_group)
        self.assertFalse(regular_user.has_perm('requests.view_request'))
        
        # Add individual permission
        regular_user.user_permissions.add(view_perm)
        self.assertTrue(regular_user.has_perm('requests.view_request'))  # Now has individual permission
        
    def test_get_all_permissions_method(self):
        """Test User.get_all_permissions() method"""
        all_perms = self.employee.get_all_permissions()
        
        expected_perms = {
            'requests.view_request',
            'requests.add_request', 
            'requests.change_request'
        }
        
        # Should contain at least the expected permissions
        self.assertTrue(expected_perms.issubset(all_perms))
        
    def test_role_name_from_groups(self):
        """Test get_role_name() returns correct role"""
        self.assertEqual(self.employee.get_role_name(), "Employee")
        self.assertEqual(self.supervisor.get_role_name(), "Supervisor")
        self.assertEqual(self.purchasing.get_role_name(), "Purchasing Team")
        
        # User with no groups
        no_group_user = User.objects.create_user(username="nogroup", password="pass123")
        self.assertEqual(no_group_user.get_role_name(), "Employee")  # Default


class PermissionAPIIntegrationTests(TestCase):
    """Test permissions work correctly with API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create users
        self.admin = User.objects.create_superuser(
            username="admin",
            password="admin123"
        )
        
        self.employee = User.objects.create_user(
            username="employee",
            password="emp123"
        )
        
        self.supervisor = User.objects.create_user(
            username="supervisor",
            password="super123"
        )
        
        # Create groups and assign permissions
        employee_group = Group.objects.create(name="Employee")
        supervisor_group = Group.objects.create(name="Supervisor")
        
        # Get permissions
        view_user = Permission.objects.get(codename='view_user')
        add_user = Permission.objects.get(codename='add_user')
        change_user = Permission.objects.get(codename='change_user')
        
        # Employee can only view
        employee_group.permissions.add(view_user)
        
        # Supervisor can view and change
        supervisor_group.permissions.add(view_user, change_user)
        
        # Assign users to groups
        self.employee.groups.add(employee_group)
        self.supervisor.groups.add(supervisor_group)
        
    def test_permission_based_endpoint_access(self):
        """Test endpoint access is controlled by permissions"""
        # Test user listing
        # Employee should be able to list (has view_user permission)
        self.client.force_authenticate(user=self.employee)
        response = self.client.get('/api/auth/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Employee should not be able to create user (no add_user permission)
        data = {
            'username': 'newuser',
            'first_name': 'New',
            'last_name': 'User'
        }
        response = self.client.post('/api/auth/users/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Supervisor should be able to view
        self.client.force_authenticate(user=self.supervisor)
        response = self.client.get('/api/auth/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Supervisor should not be able to create (no add_user permission)
        response = self.client.post('/api/auth/users/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Admin should be able to do everything
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/auth/users/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
    def test_group_management_permissions(self):
        """Test group management endpoint permissions"""
        # Only admin should be able to manage groups
        group_data = {'name': 'New Group'}
        
        # Employee cannot create groups
        self.client.force_authenticate(user=self.employee)
        response = self.client.post('/api/auth/groups/', group_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Supervisor cannot create groups
        self.client.force_authenticate(user=self.supervisor)
        response = self.client.post('/api/auth/groups/', group_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Admin can create groups
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/auth/groups/', group_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
    def test_permission_endpoint_admin_only(self):
        """Test permission endpoints are admin-only"""
        # Employee cannot access permissions
        self.client.force_authenticate(user=self.employee)
        response = self.client.get('/api/auth/permissions/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Supervisor cannot access permissions
        self.client.force_authenticate(user=self.supervisor)
        response = self.client.get('/api/auth/permissions/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Admin can access permissions
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/auth/permissions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class PermissionManagementAPITests(TestCase):
    """Test permission management through API"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        self.admin = User.objects.create_superuser(
            username="admin",
            password="admin123"
        )
        
        self.test_user = User.objects.create_user(
            username="testuser",
            password="test123"
        )
        
        self.test_group = Group.objects.create(name="Test Group")
        
    def test_add_user_to_group_via_api(self):
        """Test adding user to group through API"""
        self.client.force_authenticate(user=self.admin)
        url = f'/api/auth/users/{self.test_user.id}/manage_groups/'
        
        data = {
            'action': 'add',
            'group_ids': [self.test_group.id]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user is in group
        self.assertTrue(self.test_user.groups.filter(id=self.test_group.id).exists())
        
    def test_remove_user_from_group_via_api(self):
        """Test removing user from group through API"""
        # First add user to group
        self.test_user.groups.add(self.test_group)
        
        self.client.force_authenticate(user=self.admin)
        url = f'/api/auth/users/{self.test_user.id}/manage_groups/'
        
        data = {
            'action': 'remove',
            'group_ids': [self.test_group.id]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user is removed from group
        self.assertFalse(self.test_user.groups.filter(id=self.test_group.id).exists())
        
    def test_set_user_groups_via_api(self):
        """Test setting user's groups (replacing all) through API"""
        # Create another group
        another_group = Group.objects.create(name="Another Group")
        
        # Add user to first group
        self.test_user.groups.add(self.test_group)
        
        self.client.force_authenticate(user=self.admin)
        url = f'/api/auth/users/{self.test_user.id}/manage_groups/'
        
        data = {
            'action': 'set',
            'group_ids': [another_group.id]  # Replace with just another_group
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user is only in the new group
        self.assertFalse(self.test_user.groups.filter(id=self.test_group.id).exists())
        self.assertTrue(self.test_user.groups.filter(id=another_group.id).exists())
        self.assertEqual(self.test_user.groups.count(), 1)
        
    def test_add_permission_to_group_via_api(self):
        """Test adding permission to group through API"""
        permission = Permission.objects.get(codename='add_user')
        
        self.client.force_authenticate(user=self.admin)
        url = f'/api/auth/groups/{self.test_group.id}/manage_permissions/'
        
        data = {
            'action': 'add',
            'permission_ids': [permission.id]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify group has permission
        self.assertTrue(self.test_group.permissions.filter(id=permission.id).exists())
        
    def test_add_individual_permission_to_user_via_api(self):
        """Test adding individual permission to user through API"""
        permission = Permission.objects.get(codename='delete_user')
        
        self.client.force_authenticate(user=self.admin)
        url = f'/api/auth/users/{self.test_user.id}/manage_permissions/'
        
        data = {
            'action': 'add',
            'permission_ids': [permission.id]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user has individual permission
        self.assertTrue(self.test_user.user_permissions.filter(id=permission.id).exists())
        self.assertTrue(self.test_user.has_perm('auth.delete_user'))
        
    def test_non_admin_cannot_manage_permissions(self):
        """Test non-admin users cannot manage permissions"""
        regular_user = User.objects.create_user(
            username="regular",
            password="regular123"
        )
        
        self.client.force_authenticate(user=regular_user)
        url = f'/api/auth/users/{self.test_user.id}/manage_groups/'
        
        data = {
            'action': 'add',
            'group_ids': [self.test_group.id]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)