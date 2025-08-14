from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from requests.models import Request, ApprovalHistory
from organization.models import Worksite, Division

User = get_user_model()


class RequestViewSetTest(APITestCase):
    """Test cases for RequestViewSet"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create worksite 
        self.worksite = Worksite.objects.create(
            address="123 Test St",
            city="Test City",
            country="Turkey"
        )
        
        # Create users with hierarchy (admin first)
        self.admin_user = User.objects.create_superuser(
            username="admin",
            first_name="Admin",
            last_name="User",
            worksite=self.worksite,
            password="adminpass123"
        )
        
        # Create division with admin as creator
        self.division = Division.objects.create(
            name="Test Division",
            created_by=self.admin_user
        )
        
        self.manager = User.objects.create_user(
            username="manager",
            first_name="Man",
            last_name="Ager",
            worksite=self.worksite,
            password="managerpass123"
        )
        
        self.employee = User.objects.create_user(
            username="employee",
            first_name="Emp",
            last_name="Loyee",
            supervisor=self.manager,
            worksite=self.worksite,
            division=self.division,
            password="employeepass123"
        )
        
        # Create test request
        self.request1 = Request.objects.create(
            item="Office Chair",
            description="Ergonomic office chair",
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit="pieces",
            category="Office Furniture",
            delivery_address="Floor 2, Desk 15",
            reason="Current chair is broken"
        )
        
        # URLs
        self.requests_url = reverse('request-list')
        self.request_detail_url = lambda pk: reverse('request-detail', args=[pk])
    
    def test_list_requests_as_employee(self):
        """Test employee can list requests from their worksite"""
        self.client.force_authenticate(user=self.employee)
        
        response = self.client.get(self.requests_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['item'], 'Office Chair')
    
    def test_list_requests_as_admin_sees_all(self):
        """Test admin can see all requests"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(self.requests_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_create_request_as_employee(self):
        """Test employee can create requests"""
        self.client.force_authenticate(user=self.employee)
        
        data = {
            'item': 'Laptop',
            'description': 'Development laptop for coding',
            'quantity': '1.00',
            'unit': 'pieces',
            'category': 'IT Equipment',
            'delivery_address': 'IT Department',
            'reason': 'Current laptop is too old'
        }
        
        response = self.client.post(self.requests_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['item'], 'Laptop')
        self.assertEqual(response.data['created_by'], self.employee.id)
        self.assertEqual(response.data['status'], 'draft')
        self.assertIn('REQ-', response.data['request_number'])
    
    def test_update_draft_request(self):
        """Test updating draft request"""
        self.client.force_authenticate(user=self.employee)
        
        data = {
            'item': 'Updated Chair',
            'description': 'Updated description'
        }
        
        response = self.client.patch(self.request_detail_url(self.request1.id), data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['item'], 'Updated Chair')
    
    def test_submit_request(self):
        """Test submitting a draft request"""
        self.client.force_authenticate(user=self.employee)
        
        response = self.client.post(
            reverse('request-submit', args=[self.request1.id]),
            {'notes': 'Ready for approval'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'submitted')
        self.assertEqual(response.data['new_status'], 'pending')
        
        # Check request status was updated
        self.request1.refresh_from_db()
        self.assertEqual(self.request1.status, 'pending')
    
    def test_approve_request_as_manager(self):
        """Test manager can approve requests"""
        # First submit the request
        self.request1.transition_to('pending', self.employee)
        
        self.client.force_authenticate(user=self.manager)
        
        response = self.client.post(
            reverse('request-approve', args=[self.request1.id]),
            {'notes': 'Approved by manager'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'approved')
        
        # Check approval history was created
        history = ApprovalHistory.objects.filter(
            request=self.request1,
            user=self.manager,
            action='approved'
        ).first()
        self.assertIsNotNone(history)
    
    def test_reject_request_as_manager(self):
        """Test manager can reject requests"""
        # First submit the request
        self.request1.transition_to('pending', self.employee)
        
        self.client.force_authenticate(user=self.manager)
        
        response = self.client.post(
            reverse('request-reject', args=[self.request1.id]),
            {'notes': 'Not needed at this time'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'rejected')
        
        # Check request status
        self.request1.refresh_from_db()
        self.assertEqual(self.request1.status, 'rejected')
    
    def test_request_revision(self):
        """Test requesting revision of a submitted request"""
        # First submit the request
        self.request1.transition_to('pending', self.employee)
        
        self.client.force_authenticate(user=self.manager)
        
        response = self.client.post(
            reverse('request-request-revision', args=[self.request1.id]),
            {
                'notes': 'Need more details',
                'revision_reason': 'Please provide more specific requirements'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'revision_requested')
        
        # Check revision count incremented
        self.request1.refresh_from_db()
        self.assertEqual(self.request1.revision_count, 1)
    
    def test_my_requests_endpoint(self):
        """Test my-requests endpoint returns user's requests only"""
        self.client.force_authenticate(user=self.employee)
        
        response = self.client.get(reverse('request-my-requests'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.request1.id)
    
    def test_pending_approvals_endpoint(self):
        """Test pending-approvals endpoint for managers"""
        # Submit request so it's pending approval
        self.request1.transition_to('pending', self.employee)
        
        self.client.force_authenticate(user=self.manager)
        
        response = self.client.get(reverse('request-pending-approvals'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.request1.id)
    
    def test_request_history_endpoint(self):
        """Test request history endpoint"""
        # Create some history
        self.request1.transition_to('pending', self.employee)
        
        self.client.force_authenticate(user=self.employee)
        
        response = self.client.get(
            reverse('request-history', args=[self.request1.id])
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['action'], 'submitted')
    
    def test_filter_requests_by_status(self):
        """Test filtering requests by status"""
        self.client.force_authenticate(user=self.employee)
        
        response = self.client.get(self.requests_url, {'status': 'draft'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['status'], 'draft')
    
    def test_search_requests(self):
        """Test searching requests"""
        self.client.force_authenticate(user=self.employee)
        
        response = self.client.get(self.requests_url, {'search': 'Office'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertIn('Office', response.data['results'][0]['item'])
    
    def test_order_requests(self):
        """Test ordering requests"""
        # Create another request
        Request.objects.create(
            item="Desk Lamp",
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit="pieces",
            category="Office Furniture"
        )
        
        self.client.force_authenticate(user=self.employee)
        
        response = self.client.get(self.requests_url, {'ordering': 'item'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = [req['item'] for req in response.data['results']]
        self.assertEqual(items, sorted(items))
    
    def test_unauthorized_approval_forbidden(self):
        """Test unauthorized user cannot approve requests"""
        # Submit request
        self.request1.transition_to('pending', self.employee)
        
        # Try to approve as employee (not authorized)
        self.client.force_authenticate(user=self.employee)
        
        response = self.client.post(
            reverse('request-approve', args=[self.request1.id])
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_unauthenticated_access_forbidden(self):
        """Test unauthenticated access is forbidden"""
        response = self.client.get(self.requests_url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ApprovalHistoryViewSetTest(APITestCase):
    """Test cases for ApprovalHistoryViewSet"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            username="testuser",
            first_name="Test",
            last_name="User",
            password="testpass123"
        )
        
        self.admin = User.objects.create_superuser(
            username="admin",
            first_name="Admin",
            last_name="User",
            password="adminpass123"
        )
        
        self.request = Request.objects.create(
            item="Test Item",
            created_by=self.user,
            quantity=Decimal('1.00'),
            unit="pieces"
        )
        
        self.history = ApprovalHistory.objects.create(
            request=self.request,
            user=self.user,
            action='submitted',
            level=1,
            notes="Submitted for approval"
        )
    
    def test_list_approval_history_as_admin(self):
        """Test admin can list all approval history"""
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.get(reverse('approvalhistory-list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_filter_approval_history_by_request(self):
        """Test filtering approval history by request"""
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.get(
            reverse('approvalhistory-list'),
            {'request_id': self.request.id}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_approval_history_read_only(self):
        """Test approval history is read-only"""
        self.client.force_authenticate(user=self.admin)
        
        # Try to update approval history
        response = self.client.patch(
            reverse('approvalhistory-detail', args=[self.history.id]),
            {'notes': 'Updated notes'}
        )
        
        # Should return 405 Method Not Allowed for read-only viewset
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class AuditLogViewSetTest(APITestCase):
    """Test cases for AuditLogViewSet"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        self.admin = User.objects.create_superuser(
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
    
    def test_audit_log_admin_only(self):
        """Test only admin can access audit logs"""
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.get(reverse('auditlog-list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_audit_log_regular_user_forbidden(self):
        """Test regular user cannot access audit logs"""
        self.client.force_authenticate(user=self.regular_user)
        
        response = self.client.get(reverse('auditlog-list'))
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_audit_log_stats_endpoint(self):
        """Test audit log stats endpoint"""
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.get(reverse('auditlog-stats'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check expected stats fields
        expected_fields = [
            'total_requests', 'pending_requests', 'approved_requests',
            'rejected_requests', 'total_users', 'active_users',
            'total_worksites', 'total_divisions'
        ]
        
        for field in expected_fields:
            self.assertIn(field, response.data)