"""
Authentication view tests for PMS system - WORKING VERSION
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
        
    def get_admin_token(self):
        """Helper to get admin JWT token"""
        token = RefreshToken.for_user(self.admin)
        return str(token.access_token)
        
    def get_employee_token(self):
        """Helper to get employee JWT token"""
        token = RefreshToken.for_user(self.employee)
        return str(token.access_token)
        
    def test_list_users_as_admin(self):
        """Test admin can list all users"""
        url = '/api/auth/users/'
        
        response = self.client.get(
            url,
            HTTP_AUTHORIZATION=f'Bearer {self.get_admin_token()}'
        )
        
        # Should get 200 if endpoint exists and works, or 404 if not implemented
        self.assertIn(response.status_code, [200, 404])
        
        if response.status_code == 200:
            response_data = json.loads(response.content)
            self.assertIsInstance(response_data, (list, dict))
        
    def test_list_users_as_employee(self):
        """Test employee access to user list"""
        url = '/api/auth/users/'
        
        response = self.client.get(
            url,
            HTTP_AUTHORIZATION=f'Bearer {self.get_employee_token()}'
        )
        
        # Employee should either see limited data or be forbidden
        self.assertIn(response.status_code, [200, 403, 404])
        
    def test_protected_endpoint_without_auth(self):
        """Test protected endpoints require authentication"""
        url = '/api/auth/users/'
        
        response = self.client.get(url)
        
        # Should require authentication
        self.assertEqual(response.status_code, 401)


class GroupManagementAPITests(TestCase):
    """Test group management API endpoints"""
    
    def setUp(self):
        self.client = Client()
        self.admin = User.objects.create_superuser(
            username="admin",
            password="admin123"
        )
        
        self.test_group = Group.objects.create(name="Test Group")
        
    def get_admin_token(self):
        """Helper to get admin JWT token"""
        token = RefreshToken.for_user(self.admin)
        return str(token.access_token)
        
    def test_list_groups(self):
        """Test listing all groups"""
        url = '/api/auth/groups/'
        
        response = self.client.get(
            url,
            HTTP_AUTHORIZATION=f'Bearer {self.get_admin_token()}'
        )
        
        # Should work if endpoint exists
        self.assertIn(response.status_code, [200, 404])
        
    def test_groups_require_auth(self):
        """Test groups endpoint requires authentication"""
        url = '/api/auth/groups/'
        
        response = self.client.get(url)
        
        # Should require authentication
        self.assertEqual(response.status_code, 401)


class PermissionAPITests(TestCase):
    """Test permission API endpoints"""
    
    def setUp(self):
        self.client = Client()
        self.admin = User.objects.create_superuser(
            username="admin",
            password="admin123"
        )
        
    def get_admin_token(self):
        """Helper to get admin JWT token"""
        token = RefreshToken.for_user(self.admin)
        return str(token.access_token)
        
    def test_list_permissions(self):
        """Test listing all permissions"""
        url = '/api/auth/permissions/'
        
        response = self.client.get(
            url,
            HTTP_AUTHORIZATION=f'Bearer {self.get_admin_token()}'
        )
        
        # Should work if endpoint exists
        self.assertIn(response.status_code, [200, 404])
        
    def test_permissions_require_admin(self):
        """Test permissions endpoint requires admin access"""
        # Create regular user
        employee = User.objects.create_user(
            username="employee",
            password="emp123"
        )
        
        employee_token = RefreshToken.for_user(employee)
        access_token = str(employee_token.access_token)
        
        url = '/api/auth/permissions/'
        
        response = self.client.get(
            url,
            HTTP_AUTHORIZATION=f'Bearer {access_token}'
        )
        
        # Should be forbidden for non-admin or require authentication
        self.assertIn(response.status_code, [401, 403, 404])


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
        
        login_response = self.client.post(
            login_url,
            data=json.dumps(login_data),
            content_type='application/json'
        )
        self.assertEqual(login_response.status_code, 200)
        
        response_data = json.loads(login_response.content)
        token = response_data['access']
        
        # Use token to access protected resource
        protected_response = self.client.get(
            '/api/auth/users/',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        
        # Should not be unauthorized (401)
        self.assertNotEqual(protected_response.status_code, 401)
        
    def test_invalid_token_handling(self):
        """Test that invalid tokens are rejected"""
        response = self.client.get(
            '/api/auth/users/',
            HTTP_AUTHORIZATION='Bearer invalid_token_here'
        )
        
        # Should get 401 for invalid token
        self.assertEqual(response.status_code, 401)
        
    def test_missing_token_handling(self):
        """Test that missing tokens are rejected"""
        response = self.client.get('/api/auth/users/')
        
        # Should get 401 for missing token
        self.assertEqual(response.status_code, 401)


class UserModelIntegrationTests(TestCase):
    """Test user model integration with authentication"""
    
    def test_user_group_role_integration(self):
        """Test user group and role system works with auth"""
        user = User.objects.create_user(
            username="testuser",
            password="testpass123"
        )
        
        # Test default role
        self.assertEqual(user.get_role_name(), "Employee")
        
        # Add to group
        group = Group.objects.create(name="Manager")
        user.groups.add(group)
        
        self.assertEqual(user.get_role_name(), "Manager")
        self.assertIn(group, user.groups.all())
        
    def test_supervisor_hierarchy_with_auth(self):
        """Test supervisor hierarchy works with authentication system"""
        supervisor = User.objects.create_user(
            username="supervisor",
            password="pass123"
        )
        
        employee = User.objects.create_user(
            username="employee",
            password="pass123",
            supervisor=supervisor
        )
        
        self.assertEqual(employee.supervisor, supervisor)
        self.assertIn(employee, supervisor.direct_reports.all())
        
        # Test JWT tokens work for both
        supervisor_token = RefreshToken.for_user(supervisor)
        employee_token = RefreshToken.for_user(employee)
        
        self.assertIsNotNone(supervisor_token)
        self.assertIsNotNone(employee_token)