"""
Authentication view tests for PMS system
Tests authentication endpoints, permissions, and user management
"""
import json
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import Group, Permission
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.models import User
from organization.models import Worksite


class AuthenticationAPITests(TestCase):
    """Test authentication API endpoints"""
    
    def setUp(self):
        self.client = Client()
        self.worksite = Worksite.objects.create(
            address="Test Site", city="Test City", country="USA"
        )
        
        # Create test users
        self.admin = User.objects.create_superuser(
            username="admin",
            password="admin123",
            first_name="Admin",
            last_name="User"
        )
        
        self.employee = User.objects.create_user(
            username="employee",
            password="emp123",
            first_name="Test",
            last_name="Employee",
            worksite=self.worksite
        )
        
        # Create groups
        self.employee_group = Group.objects.create(name="Employee")
        self.supervisor_group = Group.objects.create(name="Supervisor")
        self.employee.groups.add(self.employee_group)
        
    def test_login_success(self):
        """Test successful login"""
        url = reverse('token_obtain_pair')
        data = {
            'username': 'admin',
            'password': 'admin123'
        }
        
        response = self.client.post(
            url, 
            data=json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.content)
        self.assertIn('access', response_data)
        self.assertIn('refresh', response_data)
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        url = reverse('token_obtain_pair')
        data = {
            'username': 'admin',
            'password': 'wrongpassword'
        }
        
        response = self.client.post(
            url,
            data=json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)
        
    def test_token_refresh(self):
        """Test token refresh"""
        refresh = RefreshToken.for_user(self.admin)
        url = reverse('token_refresh')
        data = {'refresh': str(refresh)}
        
        response = self.client.post(
            url,
            data=json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.content)
        self.assertIn('access', response_data)
        
    def test_get_current_user(self):
        """Test getting current user info"""
        # Get JWT token for employee
        token = RefreshToken.for_user(self.employee)
        access_token = str(token.access_token)
        
        url = '/api/auth/users/me/'
        response = self.client.get(
            url,
            HTTP_AUTHORIZATION=f'Bearer {access_token}'
        )
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.content)
        self.assertEqual(response_data['username'], 'employee')
        self.assertEqual(response_data['first_name'], 'Test')
        
    def test_get_user_permissions(self):
        """Test getting current user's permissions"""
        # Get JWT token for employee
        token = RefreshToken.for_user(self.employee)
        access_token = str(token.access_token)
        
        url = '/api/auth/users/my_permissions/'
        response = self.client.get(
            url,
            HTTP_AUTHORIZATION=f'Bearer {access_token}'
        )
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.content)
        self.assertEqual(response_data['is_superuser'], False)
        self.assertEqual(response_data['role'], 'Employee')
        self.assertEqual(len(response_data['groups']), 1)
        self.assertEqual(response_data['groups'][0]['name'], 'Employee')


class UserManagementAPITests(TestCase):
    """Test user management API endpoints"""
    
    def setUp(self):
        self.client = Client()
        
        # Create admin user
        self.admin = User.objects.create_superuser(
            username="admin",
            password="admin123"
        )
        
        # Create regular user
        self.employee = User.objects.create_user(
            username="employee",
            password="emp123",
            first_name="Test",
            last_name="Employee"
        )
        
        # Create groups
        self.employee_group = Group.objects.create(name="Employee")
        self.supervisor_group = Group.objects.create(name="Supervisor")
        
    def test_list_users_as_admin(self):
        """Test admin can list all users"""
        # Get JWT token for admin
        token = RefreshToken.for_user(self.admin)
        access_token = str(token.access_token)
        url = '/api/auth/users/'
        
        response = self.client.get(
            url,
            HTTP_AUTHORIZATION=f'Bearer {access_token}'
        )
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.content)
        self.assertEqual(len(response_data), 2)  # admin + employee
        
    def test_list_users_as_employee(self):
        """Test employee can only see themselves"""
        # Get JWT token for employee
        token = RefreshToken.for_user(self.employee)
        access_token = str(token.access_token)
        url = '/api/auth/users/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # only themselves
        self.assertEqual(response.data[0]['username'], 'employee')
        
    def test_create_user_as_admin(self):
        """Test admin can create users"""
        # Get JWT token for admin
        token = RefreshToken.for_user(self.admin)
        access_token = str(token.access_token)
        url = '/api/auth/users/'
        
        data = {
            'username': 'newuser',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'newpass123'
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())
        
    def test_create_user_as_employee_forbidden(self):
        """Test employee cannot create users"""
        # Get JWT token for employee
        token = RefreshToken.for_user(self.employee)
        access_token = str(token.access_token)
        url = '/api/auth/users/'
        
        data = {
            'username': 'newuser',
            'first_name': 'New',
            'last_name': 'User'
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_manage_user_groups(self):
        """Test managing user groups"""
        # Get JWT token for admin
        token = RefreshToken.for_user(self.admin)
        access_token = str(token.access_token)
        url = f'/api/auth/users/{self.employee.id}/manage_groups/'
        
        data = {
            'action': 'add',
            'group_ids': [self.supervisor_group.id]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        
        # Verify user is now in supervisor group
        self.assertTrue(self.employee.groups.filter(id=self.supervisor_group.id).exists())
        
    def test_manage_user_permissions(self):
        """Test managing individual user permissions"""
        # Get JWT token for admin
        token = RefreshToken.for_user(self.admin)
        access_token = str(token.access_token)
        url = f'/api/auth/users/{self.employee.id}/manage_permissions/'
        
        # Get a permission to add
        permission = Permission.objects.filter(codename='add_user').first()
        
        data = {
            'action': 'add',
            'permission_ids': [permission.id]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user has the permission
        self.assertTrue(self.employee.user_permissions.filter(id=permission.id).exists())


class GroupManagementAPITests(TestCase):
    """Test group management API endpoints"""
    
    def setUp(self):
        self.client = Client()
        self.admin = User.objects.create_superuser(
            username="admin",
            password="admin123"
        )
        
        self.test_group = Group.objects.create(name="Test Group")
        
    def test_list_groups(self):
        """Test listing all groups"""
        # Get JWT token for admin
        token = RefreshToken.for_user(self.admin)
        access_token = str(token.access_token)
        url = '/api/auth/groups/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        
    def test_create_group(self):
        """Test creating a new group"""
        # Get JWT token for admin
        token = RefreshToken.for_user(self.admin)
        access_token = str(token.access_token)
        url = '/api/auth/groups/'
        
        data = {'name': 'New Test Group'}
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Group.objects.filter(name='New Test Group').exists())
        
    def test_get_group_detail(self):
        """Test getting group details with users and permissions"""
        # Get JWT token for admin
        token = RefreshToken.for_user(self.admin)
        access_token = str(token.access_token)
        url = f'/api/auth/groups/{self.test_group.id}/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Test Group')
        self.assertIn('users', response.data)
        self.assertIn('permissions', response.data)
        
    def test_manage_group_permissions(self):
        """Test managing group permissions"""
        # Get JWT token for admin
        token = RefreshToken.for_user(self.admin)
        access_token = str(token.access_token)
        url = f'/api/auth/groups/{self.test_group.id}/manage_permissions/'
        
        permission = Permission.objects.filter(codename='add_user').first()
        
        data = {
            'action': 'add',
            'permission_ids': [permission.id]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify group has the permission
        self.assertTrue(self.test_group.permissions.filter(id=permission.id).exists())


class PermissionAPITests(TestCase):
    """Test permission API endpoints"""
    
    def setUp(self):
        self.client = Client()
        self.admin = User.objects.create_superuser(
            username="admin",
            password="admin123"
        )
        
    def test_list_permissions(self):
        """Test listing all permissions"""
        # Get JWT token for admin
        token = RefreshToken.for_user(self.admin)
        access_token = str(token.access_token)
        url = '/api/auth/permissions/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)
        
        # Check structure of permission data
        first_permission = response.data[0]
        self.assertIn('id', first_permission)
        self.assertIn('name', first_permission)
        self.assertIn('codename', first_permission)
        self.assertIn('content_type', first_permission)
        
    def test_permissions_by_content_type(self):
        """Test getting permissions grouped by content type"""
        # Get JWT token for admin
        token = RefreshToken.for_user(self.admin)
        access_token = str(token.access_token)
        url = '/api/auth/permissions/by_content_type/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)
        
        # Should have permissions grouped by model names
        self.assertIn('user', response.data)
        self.assertIn('group', response.data)
        
    def test_permissions_access_forbidden_for_non_admin(self):
        """Test non-admin users cannot access permissions"""
        employee = User.objects.create_user(
            username="employee",
            password="emp123"
        )
        
        self.client.force_authenticate(user=employee)
        url = '/api/auth/permissions/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AuthenticationIntegrationTests(TestCase):
    """Integration tests for authentication workflow"""
    
    def setUp(self):
        self.client = Client()
        
    def test_complete_authentication_workflow(self):
        """Test complete workflow: create user, login, access protected resource"""
        # Create admin
        admin = User.objects.create_superuser(
            username="admin",
            password="admin123"
        )
        
        # Admin logs in
        login_url = reverse('token_obtain_pair')
        login_data = {'username': 'admin', 'password': 'admin123'}
        
        login_response = self.client.post(login_url, login_data)
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        
        token = login_response.data['access']
        
        # Admin creates a new user
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        create_user_url = '/api/auth/users/'
        user_data = {
            'username': 'testuser',
            'first_name': 'Test',
            'last_name': 'User',
            'password': 'testpass123'
        }
        
        create_response = self.client.post(create_user_url, user_data)
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        
        # New user logs in
        self.client.credentials()  # Clear admin auth
        login_data = {'username': 'testuser', 'password': 'testpass123'}
        
        user_login_response = self.client.post(login_url, login_data)
        self.assertEqual(user_login_response.status_code, status.HTTP_200_OK)
        
        user_token = user_login_response.data['access']
        
        # New user accesses their profile
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token}')
        profile_url = '/api/auth/users/me/'
        
        profile_response = self.client.get(profile_url)
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data['username'], 'testuser')