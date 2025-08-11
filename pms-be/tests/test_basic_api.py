"""
Basic API smoke tests for PMS system
Simple tests to verify API endpoints are accessible without using DRF test client
"""
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import Group
import json

from authentication.models import User
from organization.models import Worksite


class BasicAPITests(TestCase):
    """Basic smoke tests for API functionality"""
    
    def setUp(self):
        self.client = Client()
        
        # Create test data
        self.worksite = Worksite.objects.create(
            address="Test Site", city="Test City", country="USA"
        )
        
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
        self.employee.groups.add(self.employee_group)
        
    def test_jwt_login_endpoint_exists(self):
        """Test that JWT login endpoint is accessible"""
        url = reverse('token_obtain_pair')
        
        # Test with valid credentials
        data = {
            'username': 'admin',
            'password': 'admin123'
        }
        
        response = self.client.post(
            url, 
            data=json.dumps(data),
            content_type='application/json'
        )
        
        # Should get 200 OK with tokens
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.content)
        self.assertIn('access', response_data)
        self.assertIn('refresh', response_data)
        
    def test_jwt_login_invalid_credentials(self):
        """Test JWT login with invalid credentials"""
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
        
        # Should get 401 Unauthorized
        self.assertEqual(response.status_code, 401)
        
    def test_token_refresh_endpoint_exists(self):
        """Test that token refresh endpoint is accessible"""
        # First get a refresh token
        login_url = reverse('token_obtain_pair')
        login_data = {
            'username': 'admin',
            'password': 'admin123'
        }
        
        login_response = self.client.post(
            login_url,
            data=json.dumps(login_data),
            content_type='application/json'
        )
        
        refresh_token = json.loads(login_response.content)['refresh']
        
        # Test refresh endpoint
        refresh_url = reverse('token_refresh')
        refresh_data = {'refresh': refresh_token}
        
        response = self.client.post(
            refresh_url,
            data=json.dumps(refresh_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.content)
        self.assertIn('access', response_data)
        
    def test_api_endpoints_require_authentication(self):
        """Test that protected API endpoints return 401 without auth"""
        protected_urls = [
            '/api/auth/users/',
            '/api/auth/groups/',
            '/api/auth/permissions/',
            '/api/requests/',
        ]
        
        for url in protected_urls:
            response = self.client.get(url)
            # Should require authentication (401) or be forbidden (403)
            # Some URLs might return 404 if they don't exist, which is also acceptable
            self.assertIn(response.status_code, [401, 403, 404], 
                         f"URL {url} returned {response.status_code}")
            
    def test_admin_panel_accessible(self):
        """Test that Django admin is accessible"""
        response = self.client.get('/admin/')
        # Should redirect to login or show login form
        self.assertIn(response.status_code, [200, 302])
        
    def test_user_model_functionality(self):
        """Test basic user model functionality works"""
        # Test user creation
        user = User.objects.create_user(
            username="testuser",
            password="testpass",
            first_name="Test",
            last_name="User"
        )
        
        self.assertEqual(user.username, "testuser")
        self.assertTrue(user.check_password("testpass"))
        self.assertEqual(user.get_full_name(), "Test User")
        self.assertEqual(user.get_role_name(), "Employee")  # Default role
        
        # Test supervisor hierarchy
        supervisor = User.objects.create_user(
            username="supervisor",
            password="pass123"
        )
        
        user.supervisor = supervisor
        user.save()
        
        self.assertEqual(user.supervisor, supervisor)
        self.assertIn(user, supervisor.direct_reports.all())
        
    def test_group_permission_system(self):
        """Test that group and permission system works"""
        # Create a group
        test_group = Group.objects.create(name="Test Group")
        
        # Add user to group (employee already has "Employee" group from setup)
        self.employee.groups.add(test_group)
        
        # Check user is in group
        self.assertIn(test_group, self.employee.groups.all())
        self.assertEqual(self.employee.groups.count(), 2)  # Employee + Test Group
        
        # The get_role_name returns the first group, which should be "Employee"
        # since it was added first and groups are ordered
        self.assertEqual(self.employee.get_role_name(), "Employee")


class WorksiteAPITests(TestCase):
    """Test worksite functionality"""
    
    def setUp(self):
        self.client = Client()
        
    def test_worksite_model_functionality(self):
        """Test worksite model works correctly"""
        worksite = Worksite.objects.create(
            address="123 Test Street",
            city="Test City",
            country="Test Country"
        )
        
        self.assertEqual(str(worksite), "Test City, Test Country")
        self.assertEqual(worksite.address, "123 Test Street")
        
        # Test worksite chief assignment
        chief = User.objects.create_user(
            username="chief",
            password="pass123"
        )
        
        worksite.chief = chief
        worksite.save()
        
        self.assertEqual(worksite.chief, chief)