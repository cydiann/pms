from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from organization.models import Worksite, Division
from requests.models import Request
from decimal import Decimal

User = get_user_model()


class CoreViewSetTest(APITestCase):
    """Test cases for CoreViewSet (Statistics endpoints)"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create test users
        self.admin_user = User.objects.create_superuser(
            username="admin",
            first_name="Admin",
            last_name="User",
            password="adminpass123"
        )
        
        self.regular_user = User.objects.create_user(
            username="regular",
            first_name="Regular",
            last_name="User",
            password="regularpass123"
        )
        
        # Create test worksite and division
        self.worksite = Worksite.objects.create(
            address="123 Test St",
            city="Test City",
            country="Turkey"
        )
        
        self.division = Division.objects.create(
            name="Test Division",
            created_by=self.admin_user
        )
        
        # Assign users to worksite and division
        self.regular_user.worksite = self.worksite
        self.regular_user.division = self.division
        self.regular_user.save()
        
        # Create test requests
        self.request1 = Request.objects.create(
            item="Office Chair",
            description="Ergonomic chair",
            created_by=self.regular_user,
            quantity=Decimal('1.00'),
            unit="pieces",
            category="Office Furniture",
            status="pending"
        )
        
        self.request2 = Request.objects.create(
            item="Laptop",
            description="Development laptop", 
            created_by=self.regular_user,
            quantity=Decimal('1.00'),
            unit="pieces",
            category="IT Equipment",
            status="approved"
        )
    
    def test_system_stats_as_admin(self):
        """Test system stats endpoint for admin"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(reverse('core-system-stats'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check expected fields
        expected_fields = [
            'total_users', 'active_users', 'inactive_users', 'admin_users',
            'total_worksites', 'total_divisions', 'total_requests',
            'pending_requests', 'approved_requests', 'rejected_requests',
            'completed_requests', 'requests_by_status', 'requests_by_category',
            'worksites_with_users', 'divisions_with_users', 'monthly_trends',
            'top_requesters'
        ]
        
        for field in expected_fields:
            self.assertIn(field, response.data)
        
        # Verify some values
        self.assertEqual(response.data['total_users'], 2)  # admin + regular
        self.assertEqual(response.data['total_worksites'], 1)
        self.assertEqual(response.data['total_divisions'], 1)
        self.assertEqual(response.data['total_requests'], 2)
        self.assertEqual(response.data['pending_requests'], 1)
        self.assertEqual(response.data['approved_requests'], 1)
    
    def test_system_stats_as_regular_user_forbidden(self):
        """Test regular user cannot access system stats"""
        self.client.force_authenticate(user=self.regular_user)
        
        response = self.client.get(reverse('core-system-stats'))
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_worksite_breakdown_as_admin(self):
        """Test worksite breakdown endpoint"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(reverse('core-worksite-breakdown'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # One worksite
        
        worksite_data = response.data[0]
        expected_fields = [
            'worksite_id', 'worksite_name', 'total_users', 'active_users',
            'inactive_users', 'total_requests', 'requests_by_status'
        ]
        
        for field in expected_fields:
            self.assertIn(field, worksite_data)
        
        self.assertEqual(worksite_data['total_users'], 1)  # Only regular_user
        self.assertEqual(worksite_data['total_requests'], 2)
    
    def test_division_breakdown_as_admin(self):
        """Test division breakdown endpoint"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(reverse('core-division-breakdown'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # One division
        
        division_data = response.data[0]
        expected_fields = [
            'division_id', 'division_name', 'total_users', 'active_users',
            'inactive_users', 'total_requests', 'requests_by_status'
        ]
        
        for field in expected_fields:
            self.assertIn(field, division_data)
        
        self.assertEqual(division_data['total_users'], 1)  # Only regular_user
        self.assertEqual(division_data['total_requests'], 2)
    
    def test_quick_overview_as_admin(self):
        """Test quick overview endpoint"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(reverse('core-quick-overview'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        expected_fields = [
            'total_users', 'active_users', 'total_requests',
            'pending_approvals', 'total_worksites', 'total_divisions'
        ]
        
        for field in expected_fields:
            self.assertIn(field, response.data)
        
        self.assertEqual(response.data['total_users'], 2)
        self.assertEqual(response.data['total_requests'], 2)
        self.assertEqual(response.data['pending_approvals'], 1)  # 1 pending request
    
    def test_unauthenticated_access_forbidden(self):
        """Test unauthenticated access to core endpoints"""
        endpoints = [
            'core-system-stats',
            'core-worksite-breakdown', 
            'core-division-breakdown',
            'core-quick-overview'
        ]
        
        for endpoint in endpoints:
            response = self.client.get(reverse(endpoint))
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_requests_by_status_aggregation(self):
        """Test requests are properly aggregated by status"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(reverse('core-system-stats'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        status_breakdown = response.data['requests_by_status']
        self.assertEqual(status_breakdown.get('pending', 0), 1)
        self.assertEqual(status_breakdown.get('approved', 0), 1)
        self.assertEqual(status_breakdown.get('rejected', 0), 0)  # No rejected requests
    
    def test_requests_by_category_aggregation(self):
        """Test requests are properly aggregated by category"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(reverse('core-system-stats'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        category_breakdown = response.data['requests_by_category']
        self.assertEqual(category_breakdown.get('Office Furniture', 0), 1)
        self.assertEqual(category_breakdown.get('IT Equipment', 0), 1)