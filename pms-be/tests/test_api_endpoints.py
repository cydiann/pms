"""
API endpoint tests for PMS system
Tests REST API endpoints, permissions, and error handling
"""
from django.test import TestCase
from django.contrib.auth.models import Group, Permission
from django.test import Client
from rest_framework_simplejwt.tokens import RefreshToken
from decimal import Decimal
import json

from authentication.models import User
from organization.models import Worksite, Division
from requests.models import Request


class RequestAPIEndpointTests(TestCase):
    """Test Request API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.client = Client()
        
        # Create worksite
        self.worksite = Worksite.objects.create(
            address="API Test Site",
            city="Test City",
            country="USA"
        )
        
        # Create users
        self.admin = User.objects.create_superuser(
            username="admin",
            password="admin123"
        )
        
        self.supervisor = User.objects.create_user(
            username="supervisor",
            password="super123",
            first_name="Super",
            last_name="Visor",
            worksite=self.worksite
        )
        
        self.employee = User.objects.create_user(
            username="employee", 
            password="emp123",
            first_name="Emp",
            last_name="Loyee",
            supervisor=self.supervisor,
            worksite=self.worksite
        )
        
        self.purchasing = User.objects.create_user(
            username="purchasing",
            password="pur123",
            first_name="Purchasing",
            last_name="Manager",
            worksite=self.worksite
        )
        
        # Create groups and permissions
        self.setup_permissions()
        
    def setup_permissions(self):
        """Set up groups and permissions"""
        # Create groups
        employee_group = Group.objects.create(name="Employee")
        supervisor_group = Group.objects.create(name="Supervisor")
        purchasing_group = Group.objects.create(name="Purchasing Team")
        
        # Assign users to groups
        self.employee.groups.add(employee_group)
        self.supervisor.groups.add(supervisor_group)
        self.purchasing.groups.add(purchasing_group)
        
        # Get permissions
        view_perm = Permission.objects.get(codename='view_request')
        add_perm = Permission.objects.get(codename='add_request')
        change_perm = Permission.objects.get(codename='change_request')
        delete_perm = Permission.objects.get(codename='delete_request')
        
        # Assign permissions to groups
        employee_group.permissions.add(view_perm, add_perm, change_perm)
        supervisor_group.permissions.add(view_perm, add_perm, change_perm)
        purchasing_group.permissions.add(view_perm, change_perm)
        
    def test_create_request_as_employee(self):
        """Test employee can create a request"""
        # Get JWT token for self.employee)
        
        url = '/api/requests/'
        data = {
            'request_number': 'REQ-API-001',
            'item': 'API Test Item',
            'description': 'Test item for API testing',
            'quantity': '3.00',
            'unit': 'pieces',
            'category': 'Test',
            'delivery_address': 'Test Office',
            'reason': 'API testing purposes'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['item'], 'API Test Item')
        self.assertEqual(response.data['status'], 'draft')
        self.assertEqual(response.data['created_by'], self.employee.id)
        
    def test_create_request_unauthenticated(self):
        """Test unauthenticated user cannot create request"""
        url = '/api/requests/'
        data = {
            'request_number': 'REQ-UNAUTH-001',
            'item': 'Unauthorized Item',
            'quantity': '1.00',
            'unit': 'pieces'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 401)
        
    def test_list_requests_employee_sees_own_only(self):
        """Test employee can only see their own requests"""
        # Create requests for different users
        employee_request = Request.objects.create(
            request_number='REQ-EMP-001',
            item='Employee Item',
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit='pieces'
        )
        
        supervisor_request = Request.objects.create(
            request_number='REQ-SUP-001', 
            item='Supervisor Item',
            created_by=self.supervisor,
            quantity=Decimal('1.00'),
            unit='pieces'
        )
        
        # Employee should only see their own
        # Get JWT token for self.employee)
        url = '/api/requests/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], employee_request.id)
        
    def test_list_requests_admin_sees_all(self):
        """Test admin can see all requests"""
        # Create requests for different users
        Request.objects.create(
            request_number='REQ-ALL-001',
            item='Item 1',
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit='pieces'
        )
        
        Request.objects.create(
            request_number='REQ-ALL-002',
            item='Item 2', 
            created_by=self.supervisor,
            quantity=Decimal('1.00'),
            unit='pieces'
        )
        
        # Admin should see all
        # Get JWT token for self.admin)
        url = '/api/requests/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        
    def test_update_request_in_draft(self):
        """Test updating request in draft status"""
        request = Request.objects.create(
            request_number='REQ-UPDATE-001',
            item='Original Item',
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit='pieces',
            status='draft'
        )
        
        # Get JWT token for self.employee)
        url = f'/api/requests/{request.id}/'
        
        data = {
            'item': 'Updated Item',
            'description': 'Updated description',
            'quantity': '2.00'
        }
        
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['item'], 'Updated Item')
        
        # Verify database was updated
        request.refresh_from_db()
        self.assertEqual(request.item, 'Updated Item')
        self.assertEqual(request.quantity, Decimal('2.00'))
        
    def test_update_request_after_submission_forbidden(self):
        """Test updating request after submission is forbidden"""
        request = Request.objects.create(
            request_number='REQ-SUBMITTED-001',
            item='Submitted Item',
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit='pieces',
            status='pending'  # Already submitted
        )
        
        # Get JWT token for self.employee)
        url = f'/api/requests/{request.id}/'
        
        data = {'item': 'Should Not Update'}
        
        response = self.client.patch(url, data, format='json')
        # This should be forbidden based on business rules
        # (Implementation depends on view logic)
        self.assertIn(response.status_code, [403, 400])
        
    def test_delete_request_admin_only(self):
        """Test only admin can delete requests"""
        request = Request.objects.create(
            request_number='REQ-DELETE-001',
            item='To Delete',
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit='pieces'
        )
        
        # Employee cannot delete
        # Get JWT token for self.employee)
        url = f'/api/requests/{request.id}/'
        
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 403)
        
        # Admin can delete
        # Get JWT token for self.admin)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify request is deleted
        self.assertFalse(Request.objects.filter(id=request.id).exists())
        
    def test_get_request_detail(self):
        """Test getting request details"""
        request = Request.objects.create(
            request_number='REQ-DETAIL-001',
            item='Detail Item',
            description='Detailed description',
            created_by=self.employee,
            quantity=Decimal('5.00'),
            unit='pieces',
            category='Test Category'
        )
        
        # Get JWT token for self.employee)
        url = f'/api/requests/{request.id}/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['request_number'], 'REQ-DETAIL-001')
        self.assertEqual(response.data['item'], 'Detail Item')
        self.assertEqual(response.data['quantity'], '5.00')
        
    def test_request_validation(self):
        """Test request data validation"""
        # Get JWT token for self.employee)
        url = '/api/requests/'
        
        # Test missing required fields
        data = {
            'item': 'Test Item'
            # Missing required fields like quantity, unit
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 400)
        
        # Test invalid quantity
        data = {
            'request_number': 'REQ-INVALID-001',
            'item': 'Test Item',
            'quantity': 'not_a_number',
            'unit': 'pieces'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 400)
        
    def test_request_number_uniqueness(self):
        """Test request number must be unique"""
        # Create first request
        Request.objects.create(
            request_number='REQ-UNIQUE-001',
            item='First Item',
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit='pieces'
        )
        
        # Get JWT token for self.employee)
        url = '/api/requests/'
        
        # Try to create second request with same number
        data = {
            'request_number': 'REQ-UNIQUE-001',  # Same as above
            'item': 'Second Item',
            'quantity': '1.00',
            'unit': 'pieces'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 400)
        
    def test_filtering_requests(self):
        """Test filtering requests by status"""
        # Create requests with different statuses
        draft_request = Request.objects.create(
            request_number='REQ-DRAFT-001',
            item='Draft Item',
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit='pieces',
            status='draft'
        )
        
        pending_request = Request.objects.create(
            request_number='REQ-PENDING-001',
            item='Pending Item', 
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit='pieces',
            status='pending'
        )
        
        # Get JWT token for self.employee)
        
        # Filter by draft status
        url = '/api/requests/?status=draft'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], draft_request.id)
        
        # Filter by pending status
        url = '/api/requests/?status=pending'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], pending_request.id)


class RequestActionAPITests(TestCase):
    """Test Request action endpoints (approve, reject, etc.)"""
    
    def setUp(self):
        self.client = Client()
        
        # Create users
        self.supervisor = User.objects.create_user(
            username="supervisor",
            password="super123"
        )
        
        self.employee = User.objects.create_user(
            username="employee",
            password="emp123",
            supervisor=self.supervisor
        )
        
        # Create test request
        self.request = Request.objects.create(
            request_number='REQ-ACTION-001',
            item='Action Test Item',
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit='pieces',
            status='pending'
        )
        
    def test_submit_request_action(self):
        """Test submitting a draft request"""
        draft_request = Request.objects.create(
            request_number='REQ-SUBMIT-001',
            item='Submit Test',
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit='pieces',
            status='draft'
        )
        
        # Get JWT token for self.employee)
        url = f'/api/requests/{draft_request.id}/submit/'
        
        data = {'notes': 'Submitting for approval'}
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 200)
        
        # Verify status changed
        draft_request.refresh_from_db()
        self.assertEqual(draft_request.status, 'pending')
        
    def test_approve_request_action(self):
        """Test approving a request as supervisor"""
        # Get JWT token for self.supervisor)
        url = f'/api/requests/{self.request.id}/approve/'
        
        data = {'notes': 'Approved for purchase'}
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 200)
        
        # Verify status changed
        self.request.refresh_from_db()
        self.assertIn(self.request.status, ['approved', 'in_review'])  # Depends on approval chain
        
    def test_reject_request_action(self):
        """Test rejecting a request"""
        # Get JWT token for self.supervisor)
        url = f'/api/requests/{self.request.id}/reject/'
        
        data = {'notes': 'Budget constraints'}
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 200)
        
        # Verify status changed
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, 'rejected')
        
    def test_request_revision_action(self):
        """Test requesting revision"""
        # Get JWT token for self.supervisor)
        url = f'/api/requests/{self.request.id}/revise/'
        
        data = {'notes': 'Please provide more details and quotes'}
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 200)
        
        # Verify status changed
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, 'revision_requested')
        
    def test_unauthorized_action_forbidden(self):
        """Test unauthorized user cannot perform actions"""
        other_user = User.objects.create_user(
            username="other",
            password="other123"
        )
        
        # Get JWT token for other_user)
        url = f'/api/requests/{self.request.id}/approve/'
        
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, 403)


class OrganizationAPITests(TestCase):
    """Test Organization API endpoints"""
    
    def setUp(self):
        self.client = Client()
        
        self.user = User.objects.create_user(
            username="user",
            password="user123"
        )
        
        self.worksite = Worksite.objects.create(
            address="Test Address",
            city="Test City",
            country="USA"
        )
        
        self.division = Division.objects.create(
            name="Test Division",
            created_by=self.user
        )
        self.division.worksites.add(self.worksite)
        
    def test_list_worksites(self):
        """Test listing worksites"""
        # Get JWT token for self.user)
        url = '/api/org/worksites/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['city'], 'Test City')
        
    def test_list_divisions(self):
        """Test listing divisions"""
        # Get JWT token for self.user)
        url = '/api/org/divisions/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Test Division')
        
    def test_worksite_access_unauthenticated(self):
        """Test unauthenticated access is denied"""
        url = '/api/org/worksites/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)


class APIErrorHandlingTests(TestCase):
    """Test API error handling and edge cases"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="user",
            password="user123"
        )
        
    def test_404_for_nonexistent_request(self):
        """Test 404 for non-existent request"""
        # Get JWT token for self.user)
        url = '/api/requests/99999/'  # Non-existent ID
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)
        
    def test_405_for_invalid_method(self):
        """Test 405 for invalid HTTP method"""
        # Get JWT token for self.user)
        url = '/api/requests/'
        
        response = self.client.patch(url)  # PATCH not allowed on list endpoint
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        
    def test_malformed_json_handling(self):
        """Test handling of malformed JSON"""
        # Get JWT token for self.user)
        url = '/api/requests/'
        
        # Send malformed JSON
        response = self.client.post(
            url, 
            data='{"malformed": json}',  # Invalid JSON
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        
    def test_large_payload_handling(self):
        """Test handling of large payloads"""
        # Get JWT token for self.user)
        url = '/api/requests/'
        
        # Create very large description
        large_description = 'A' * 10000  # 10KB description
        
        data = {
            'request_number': 'REQ-LARGE-001',
            'item': 'Large Item',
            'description': large_description,
            'quantity': '1.00',
            'unit': 'pieces'
        }
        
        response = self.client.post(url, data, format='json')
        # Should still work unless there's a specific size limit
        self.assertIn(response.status_code, [201, 400])