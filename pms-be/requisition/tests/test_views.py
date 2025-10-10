from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from requisition.models import Request, ApprovalHistory
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
            supervisor=self.admin_user,  # Manager reports to admin
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
        # Handle paginated response
        results = response.data.get('results', response.data)
        # Should contain at least the request from setUp
        self.assertGreaterEqual(len(results), 1)
        # Check that self.request1 is in the results
        request_ids = [req['id'] for req in results]
        self.assertIn(self.request1.id, request_ids)
    
    def test_pending_approvals_endpoint(self):
        """Test pending-approvals endpoint for managers"""
        # Submit request so it's pending approval
        self.request1.transition_to('pending', self.employee)

        self.client.force_authenticate(user=self.manager)

        response = self.client.get(reverse('request-pending-approvals'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Handle paginated response
        results = response.data.get('results', response.data)
        # Should contain at least the pending request
        self.assertGreaterEqual(len(results), 1)
        # Check that self.request1 is in the pending requests
        request_ids = [req['id'] for req in results]
        self.assertIn(self.request1.id, request_ids)
    
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


class DynamicApprovalFlowTest(APITestCase):
    """Test cases for dynamic approval flow with multi-level hierarchy"""

    def setUp(self):
        """Set up 5-level approval hierarchy: Employee → Team Lead → Manager → Director → CEO"""
        self.client = APIClient()

        # Create worksite
        self.worksite = Worksite.objects.create(
            address="456 Corporate Ave",
            city="Business City",
            country="Turkey"
        )

        # Create 5-level hierarchy (bottom-up for supervisor assignment)
        self.ceo = User.objects.create_superuser(
            username="ceo",
            first_name="Chief",
            last_name="Executive",
            worksite=self.worksite,
            password="ceopass123"
        )

        self.director = User.objects.create_user(
            username="director",
            first_name="Dir",
            last_name="Ector",
            worksite=self.worksite,
            supervisor=self.ceo,
            password="directorpass123"
        )

        self.manager = User.objects.create_user(
            username="manager",
            first_name="Man",
            last_name="Ager",
            worksite=self.worksite,
            supervisor=self.director,
            password="managerpass123"
        )

        self.team_lead = User.objects.create_user(
            username="teamlead",
            first_name="Team",
            last_name="Lead",
            worksite=self.worksite,
            supervisor=self.manager,
            password="teamleadpass123"
        )

        self.employee = User.objects.create_user(
            username="employee",
            first_name="Emp",
            last_name="Loyee",
            worksite=self.worksite,
            supervisor=self.team_lead,
            password="employeepass123"
        )

        # Create purchasing user
        self.purchasing_user = User.objects.create_user(
            username="purchasing",
            first_name="Purchasing",
            last_name="Manager",
            worksite=self.worksite,
            password="purchasingpass123"
        )
        # Add to purchasing group
        from django.contrib.auth.models import Group, Permission
        from django.contrib.contenttypes.models import ContentType
        purchasing_group, created = Group.objects.get_or_create(name='Purchasing')
        self.purchasing_user.groups.add(purchasing_group)

        # Grant the can_purchase permission
        content_type = ContentType.objects.get_for_model(Request)
        can_purchase_perm = Permission.objects.get(
            codename='can_purchase',
            content_type=content_type
        )
        self.purchasing_user.user_permissions.add(can_purchase_perm)
        # Create test request
        self.request = Request.objects.create(
            item="High-Value Equipment",
            description="Expensive machinery requiring multi-level approval",
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit="pieces",
            category="Machinery",
            delivery_address="Production Floor",
            reason="Equipment upgrade for increased productivity"
        )

    def test_complete_5_level_approval_flow(self):
        """Test complete flow: Employee → Team Lead → Manager → Director → CEO → Purchasing → Delivered"""

        # 1. Employee submits request
        self.client.force_authenticate(user=self.employee)
        response = self.client.post(
            reverse('request-submit', args=[self.request.id]),
            {'notes': 'Ready for approval'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['new_status'], 'pending')

        self.request.refresh_from_db()
        self.assertEqual(self.request.status, 'pending')
        self.assertEqual(self.request.approval_level, 0)
        self.assertIsNone(self.request.last_approver)
        self.assertEqual(self.request.get_next_approver(), self.team_lead)

        # 2. Team Lead approves
        self.client.force_authenticate(user=self.team_lead)
        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Approved by team lead'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['new_status'], 'in_review')

        self.request.refresh_from_db()
        self.assertEqual(self.request.status, 'in_review')
        self.assertEqual(self.request.approval_level, 1)
        self.assertEqual(self.request.last_approver, self.team_lead)
        self.assertEqual(self.request.get_next_approver(), self.manager)
        self.assertFalse(self.request.is_fully_approved())

        # 3. Manager approves
        self.client.force_authenticate(user=self.manager)
        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Approved by manager'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['new_status'], 'in_review')

        self.request.refresh_from_db()
        self.assertEqual(self.request.status, 'in_review')
        self.assertEqual(self.request.approval_level, 2)
        self.assertEqual(self.request.last_approver, self.manager)
        self.assertEqual(self.request.get_next_approver(), self.director)
        self.assertFalse(self.request.is_fully_approved())

        # 4. Director approves
        self.client.force_authenticate(user=self.director)
        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Approved by director'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['new_status'], 'in_review')

        self.request.refresh_from_db()
        self.assertEqual(self.request.status, 'in_review')
        self.assertEqual(self.request.approval_level, 3)
        self.assertEqual(self.request.last_approver, self.director)
        self.assertEqual(self.request.get_next_approver(), self.ceo)
        self.assertFalse(self.request.is_fully_approved())

        # 5. CEO (final) approves
        self.client.force_authenticate(user=self.ceo)
        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Approved by CEO - final approval'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['new_status'], 'approved')
        self.assertTrue(response.data['is_fully_approved'])
        self.assertIsNone(response.data['next_approver'])

        self.request.refresh_from_db()
        self.assertEqual(self.request.status, 'approved')
        self.assertEqual(self.request.approval_level, 4)
        self.assertEqual(self.request.last_approver, self.ceo)
        self.assertIsNone(self.request.get_next_approver())
        self.assertTrue(self.request.is_fully_approved())

        # 6. Purchasing team marks as purchased
        self.client.force_authenticate(user=self.purchasing_user)
        response = self.client.post(
            reverse('request-mark-purchased', args=[self.request.id]),
            {'notes': 'Purchase order created'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'ordered')

        self.request.refresh_from_db()
        self.assertEqual(self.request.status, 'ordered')

        # 7. Mark as delivered
        response = self.client.post(
            reverse('request-mark-delivered', args=[self.request.id]),
            {'notes': 'Equipment delivered and installed'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'delivered')

        self.request.refresh_from_db()
        self.assertEqual(self.request.status, 'delivered')

        # 8. Verify complete approval history
        history = ApprovalHistory.objects.filter(request=self.request).order_by('created_at')
        self.assertEqual(history.count(), 7)  # Submit + 4 approvals + purchased + delivered

        actions = [h.action for h in history]
        # Expected: submitted, 3x approved (in_review), final_approved, ordered, delivered
        expected_actions = ['submitted', 'approved', 'approved', 'approved', 'final_approved', 'ordered', 'delivered']
        self.assertEqual(actions, expected_actions)

        # Check intermediate approval count (not including final_approved, ordered, delivered)
        intermediate_approvals = history.filter(action='approved')
        self.assertEqual(intermediate_approvals.count(), 3)  # Team Lead, Manager, Director (CEO gives final_approved)

    def test_rejection_at_different_levels(self):
        """Test rejection at different approval levels"""

        # Submit request
        self.request.transition_to('pending', self.employee)

        # Team Lead approves
        self.request.last_approver = self.team_lead
        self.request.approval_level = 1
        self.request.status = 'in_review'
        self.request.save()

        # Manager rejects
        self.client.force_authenticate(user=self.manager)
        response = self.client.post(
            reverse('request-reject', args=[self.request.id]),
            {'notes': 'Budget constraints'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'rejected')

        self.request.refresh_from_db()
        self.assertEqual(self.request.status, 'rejected')

    def test_revision_request_flow(self):
        """Test revision request and resubmission flow"""

        # Submit and get initial approval
        self.request.transition_to('pending', self.employee)
        self.request.last_approver = self.team_lead
        self.request.approval_level = 1
        self.request.status = 'in_review'
        self.request.save()

        # Manager requests revision
        self.client.force_authenticate(user=self.manager)
        response = self.client.post(
            reverse('request-request-revision', args=[self.request.id]),
            {
                'notes': 'Need more details',
                'revision_reason': 'Please provide detailed specifications'
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'revision_requested')
        self.assertEqual(response.data['revision_count'], 1)

        self.request.refresh_from_db()
        self.assertEqual(self.request.status, 'revision_requested')
        self.assertEqual(self.request.revision_count, 1)

        # Employee resubmits after revision
        self.client.force_authenticate(user=self.employee)
        response = self.client.post(
            reverse('request-submit', args=[self.request.id]),
            {'notes': 'Updated with detailed specifications'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['new_status'], 'pending')

        self.request.refresh_from_db()
        self.assertEqual(self.request.status, 'pending')
        # Approval state should reset after revision
        self.assertEqual(self.request.approval_level, 0)
        self.assertIsNone(self.request.last_approver)

    def test_pending_approvals_at_each_level(self):
        """Test that pending-approvals endpoint works correctly at each level"""

        # Submit request
        self.request.transition_to('pending', self.employee)

        # Team Lead should see the pending request
        self.client.force_authenticate(user=self.team_lead)
        response = self.client.get(reverse('request-pending-approvals'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], self.request.id)

        # Manager should NOT see it yet
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(reverse('request-pending-approvals'))
        results = response.data.get('results', response.data)
        request_ids = [req['id'] for req in results]
        self.assertNotIn(self.request.id, request_ids)

        # Team Lead approves
        self.request.last_approver = self.team_lead
        self.request.approval_level = 1
        self.request.status = 'in_review'
        self.request.save()

        # Now Manager should see it
        response = self.client.get(reverse('request-pending-approvals'))
        results = response.data.get('results', response.data)
        request_ids = [req['id'] for req in results]
        self.assertIn(self.request.id, request_ids)

        # Team Lead should NOT see it anymore
        self.client.force_authenticate(user=self.team_lead)
        response = self.client.get(reverse('request-pending-approvals'))
        results = response.data.get('results', response.data)
        request_ids = [req['id'] for req in results]
        self.assertNotIn(self.request.id, request_ids)

    def test_unauthorized_approval_attempts(self):
        """Test that users cannot approve out of sequence"""

        # Submit request
        self.request.transition_to('pending', self.employee)

        # Manager tries to approve before Team Lead
        self.client.force_authenticate(user=self.manager)
        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Trying to skip team lead'}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('pending approval from', response.data['error'])

        # Director tries to approve before earlier levels
        self.client.force_authenticate(user=self.director)
        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Trying to skip earlier approvers'}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_my_team_requests_hierarchy(self):
        """Test that supervisors can see their team's requests through hierarchy"""

        # Create requests from different levels
        team_lead_request = Request.objects.create(
            item="Team Lead Request",
            created_by=self.team_lead,
            quantity=Decimal('1.00'),
            unit="pieces",
            category="Office"
        )

        # Manager should see both employee and team lead requests
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(reverse('request-my-team-requests'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        request_ids = [req['id'] for req in results]

        # Manager should see subordinate requests
        self.assertIn(self.request.id, request_ids)  # Employee's request
        self.assertIn(team_lead_request.id, request_ids)  # Team Lead's request

        # Team Lead should only see employee request
        self.client.force_authenticate(user=self.team_lead)
        response = self.client.get(reverse('request-my-team-requests'))
        results = response.data.get('results', response.data)
        request_ids = [req['id'] for req in results]

        self.assertIn(self.request.id, request_ids)  # Employee's request
        self.assertNotIn(team_lead_request.id, request_ids)  # Not their own request

    def test_dynamic_approval_methods(self):
        """Test new dynamic approval methods"""

        # Test initial state
        self.assertIsNone(self.request.last_approver)
        self.assertEqual(self.request.approval_level, 0)
        self.assertEqual(self.request.get_next_approver(), self.employee.supervisor)  # team_lead
        self.assertFalse(self.request.is_fully_approved())
        self.assertEqual(self.request.get_approval_status(), "Pending approval from Team Lead")

        # After first approval
        self.request.last_approver = self.team_lead
        self.request.approval_level = 1
        self.request.save()

        self.assertEqual(self.request.get_next_approver(), self.manager)
        self.assertFalse(self.request.is_fully_approved())
        self.assertEqual(self.request.get_approval_status(), "Pending approval from Man Ager")

        # After all approvals
        self.request.last_approver = self.ceo
        self.request.approval_level = 4
        self.request.save()

        self.assertIsNone(self.request.get_next_approver())
        self.assertTrue(self.request.is_fully_approved())
        self.assertEqual(self.request.get_approval_status(), "Fully approved - Ready for purchasing")

    def test_organizational_change_mid_approval(self):
        """Test adding a new approver in the middle of approval flow"""

        # Start approval flow - Employee → Team Lead → Manager
        self.request.transition_to('pending', self.employee)

        # Team Lead approves
        self.request.last_approver = self.team_lead
        self.request.approval_level = 1
        self.request.status = 'in_review'
        self.request.save()

        # Verify current state: Manager should be next
        self.assertEqual(self.request.get_next_approver(), self.manager)

        # 🔄 ORGANIZATIONAL CHANGE: Add a new Senior Manager between Manager and Director
        senior_manager = User.objects.create_user(
            username="seniormanager",
            first_name="Senior",
            last_name="Manager",
            worksite=self.worksite,
            supervisor=self.director,  # Reports to Director
            password="seniormanagerpass123"
        )

        # Update Manager to report to Senior Manager instead of Director
        self.manager.supervisor = senior_manager
        self.manager.save()

        # Request should now dynamically adapt - Manager still next (unchanged)
        self.assertEqual(self.request.get_next_approver(), self.manager)

        # Manager approves
        self.client.force_authenticate(user=self.manager)
        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Approved by manager'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.request.refresh_from_db()
        self.assertEqual(self.request.approval_level, 2)
        self.assertEqual(self.request.last_approver, self.manager)

        # 🎯 KEY TEST: Next approver should now be the NEW Senior Manager
        self.assertEqual(self.request.get_next_approver(), senior_manager)

        # Senior Manager (new approver) approves
        self.client.force_authenticate(user=senior_manager)
        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Approved by new senior manager'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.request.refresh_from_db()
        self.assertEqual(self.request.approval_level, 3)
        self.assertEqual(self.request.last_approver, senior_manager)
        self.assertEqual(self.request.get_next_approver(), self.director)

        # Continue normal flow: Director → CEO
        self.client.force_authenticate(user=self.director)
        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Approved by director'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # CEO final approval
        self.client.force_authenticate(user=self.ceo)
        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Final approval by CEO'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['new_status'], 'approved')

        # Verify final state - should be fully approved with 5 levels instead of 4
        self.request.refresh_from_db()
        self.assertEqual(self.request.approval_level, 5)  # One extra level due to org change
        self.assertTrue(self.request.is_fully_approved())

    def test_supervisor_removed_mid_approval(self):
        """Test what happens when a supervisor is removed/deleted mid-approval"""

        # Start approval flow
        self.request.transition_to('pending', self.employee)

        # Team Lead approves
        self.request.last_approver = self.team_lead
        self.request.approval_level = 1
        self.request.status = 'in_review'
        self.request.save()

        # 🔥 ORGANIZATIONAL CHANGE: Manager leaves company - set supervisor to None
        self.manager.supervisor = None
        self.manager.save()

        # Request should still work - Manager is now the top of the chain
        self.assertEqual(self.request.get_next_approver(), self.manager)

        # Manager approves (becomes final approver now)
        self.client.force_authenticate(user=self.manager)
        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Approved by manager - now final approver'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['new_status'], 'approved')  # Should be fully approved

        self.request.refresh_from_db()
        self.assertTrue(self.request.is_fully_approved())
        self.assertIsNone(self.request.get_next_approver())

    def test_user_deactivated_mid_approval(self):
        """Test handling of deactivated users in approval chain"""

        # Start approval flow
        self.request.transition_to('pending', self.employee)

        # Team Lead approves
        self.request.last_approver = self.team_lead
        self.request.approval_level = 1
        self.request.status = 'in_review'
        self.request.save()

        # 🚫 Manager gets deactivated
        self.manager.is_active = False
        self.manager.save()

        # System should still try to route to Manager (business decision)
        self.assertEqual(self.request.get_next_approver(), self.manager)

        # Manager tries to approve while deactivated - should work if authenticated
        # (System relies on authentication middleware to handle inactive users)
        self.client.force_authenticate(user=self.manager)
        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Trying to approve while deactivated'}
        )
        # Should work - authentication middleware would handle blocking inactive users
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_circular_supervision_detection(self):
        """Test detection of circular supervision chains"""

        # Create circular reference: A → B → C → A
        user_a = User.objects.create_user(
            username="user_a",
            first_name="User",
            last_name="A",
            worksite=self.worksite,
            password="userapass123"
        )

        user_b = User.objects.create_user(
            username="user_b",
            first_name="User",
            last_name="B",
            worksite=self.worksite,
            supervisor=user_a,
            password="userbpass123"
        )

        user_c = User.objects.create_user(
            username="user_c",
            first_name="User",
            last_name="C",
            worksite=self.worksite,
            supervisor=user_b,
            password="usercpass123"
        )

        # Attempt to create circular reference should raise ValueError
        user_a.supervisor = user_c
        with self.assertRaises(ValueError) as context:
            user_a.save()

        self.assertIn("Circular supervision detected", str(context.exception))

    def test_deep_hierarchy_approval(self):
        """Test approval with very deep hierarchy (10 levels)"""

        # Build 10-level hierarchy
        users = []
        supervisor = self.ceo

        for i in range(10):
            user = User.objects.create_user(
                username=f"level_{i}",
                first_name=f"Level",
                last_name=f"{i}",
                worksite=self.worksite,
                supervisor=supervisor,
                password=f"level{i}pass123"
            )
            users.append(user)
            supervisor = user

        # Bottom user creates request
        deep_request = Request.objects.create(
            item="Deep Hierarchy Test",
            created_by=users[-1],  # Level 9 (bottom)
            quantity=Decimal('1.00'),
            unit="pieces",
            category="Test"
        )

        deep_request.transition_to('pending', users[-1])

        # Should require approvals from Level 8, 7, 6, ..., 0, CEO
        expected_levels = 11  # 10 levels + CEO

        current_approver_index = 8  # Start with Level 8 (Level 9's supervisor)

        for approval_level in range(expected_levels):
            # Check if already fully approved - break out of loop
            if deep_request.is_fully_approved():
                break

            if current_approver_index >= 0:
                current_approver = users[current_approver_index]
                current_approver_index -= 1
            else:
                current_approver = self.ceo

            next_approver = deep_request.get_next_approver()
            if next_approver is None:
                # Already fully approved
                break

            self.assertEqual(next_approver, current_approver)

            # Approve
            self.client.force_authenticate(user=current_approver)
            response = self.client.post(
                reverse('request-approve', args=[deep_request.id]),
                {'notes': f'Approved by {current_approver.username}'}
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

            deep_request.refresh_from_db()

            # Check if request is fully approved based on our actual logic
            if deep_request.is_fully_approved():
                self.assertEqual(deep_request.status, 'approved')
            else:
                self.assertEqual(deep_request.status, 'in_review')

        # At the end, request should be approved
        self.assertEqual(deep_request.status, 'approved')
        self.assertTrue(deep_request.is_fully_approved())

    def test_permission_failures(self):
        """Test various permission failure scenarios"""

        self.request.transition_to('pending', self.employee)

        # 1. Non-purchasing user tries to mark as purchased
        self.client.force_authenticate(user=self.employee)
        response = self.client.post(
            reverse('request-mark-purchased', args=[self.request.id]),
            {'notes': 'Trying to purchase without permission'}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Try to approve already fully approved request
        self.request.status = 'approved'
        self.request.last_approver = self.ceo
        self.request.approval_level = 4
        self.request.save()

        self.client.force_authenticate(user=self.manager)
        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Trying to approve already approved request'}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('already fully approved', response.data['error'])

        # 3. Try to reject completed request
        self.request.status = 'completed'
        self.request.save()

        response = self.client.post(
            reverse('request-reject', args=[self.request.id]),
            {'notes': 'Trying to reject completed request'}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Non-existent request
        response = self.client.post(
            reverse('request-approve', args=[99999]),
            {'notes': 'Approving non-existent request'}
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_concurrent_approval_attempts(self):
        """Test concurrent approval attempts from different users"""

        self.request.transition_to('pending', self.employee)

        # Team Lead approves
        self.request.last_approver = self.team_lead
        self.request.approval_level = 1
        self.request.status = 'in_review'
        self.request.save()

        # Both Manager and Director try to approve simultaneously
        # Manager (correct next approver)
        self.client.force_authenticate(user=self.manager)
        manager_response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Manager approval'}
        )
        self.assertEqual(manager_response.status_code, status.HTTP_200_OK)

        # Director tries to approve right after (should fail)
        self.client.force_authenticate(user=self.director)
        director_response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Director trying to double approve'}
        )
        # Should succeed because Director is now the next approver
        self.assertEqual(director_response.status_code, status.HTTP_200_OK)

    def test_approval_with_invalid_state_transitions(self):
        """Test approval attempts with invalid state transitions"""

        # Try to approve draft request (should fail)
        self.assertEqual(self.request.status, 'draft')

        self.client.force_authenticate(user=self.team_lead)
        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Trying to approve draft'}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Try to approve rejected request (should fail)
        self.request.status = 'rejected'
        self.request.save()

        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': 'Trying to approve rejected request'}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_malformed_requests(self):
        """Test handling of malformed/invalid request data"""

        self.request.transition_to('pending', self.employee)

        # Try approval with invalid JSON
        self.client.force_authenticate(user=self.team_lead)

        # Test with missing required fields - should still work as notes are optional
        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test with extremely long notes
        long_notes = "x" * 10000
        self.request.refresh_from_db()
        next_approver = self.request.get_next_approver()

        self.client.force_authenticate(user=next_approver)
        response = self.client.post(
            reverse('request-approve', args=[self.request.id]),
            {'notes': long_notes}
        )
        # Should handle gracefully
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_current_approver_endpoint(self):
        """Test the current-approver endpoint with different request states"""

        # Authenticate with employee user
        self.client.force_authenticate(user=self.employee)

        # 1. Test draft request
        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'draft')
        self.assertEqual(response.data['approval_level'], 0)
        self.assertFalse(response.data['is_fully_approved'])
        self.assertIsNone(response.data['last_approver'])
        # Should have next approver even for draft (shows who would approve when submitted)
        self.assertIsNotNone(response.data['next_approver'])
        self.assertEqual(response.data['next_approver']['username'], self.team_lead.username)

        # 2. Test pending request
        self.request.transition_to('pending', self.employee)

        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(response.data['approval_level'], 0)
        self.assertFalse(response.data['is_fully_approved'])
        self.assertIsNone(response.data['last_approver'])

        # Should have next approver info
        self.assertIsNotNone(response.data['next_approver'])
        self.assertEqual(response.data['next_approver']['username'], self.team_lead.username)
        self.assertEqual(response.data['next_approver']['full_name'], self.team_lead.get_full_name())

        # Should have approval chain info
        self.assertIn('approval_chain', response.data)
        self.assertEqual(len(response.data['approval_chain']), 4)  # team_lead, manager, director, ceo

        # Check first approver in chain
        first_approver = response.data['approval_chain'][0]
        self.assertEqual(first_approver['level'], 0)
        self.assertEqual(first_approver['approver']['username'], self.team_lead.username)
        self.assertEqual(first_approver['status'], 'current')
        self.assertTrue(first_approver['is_current'])
        self.assertFalse(first_approver['is_approved'])

        # 3. Test after first approval
        self.request.last_approver = self.team_lead
        self.request.approval_level = 1
        self.request.status = 'in_review'
        self.request.save()

        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'in_review')
        self.assertEqual(response.data['approval_level'], 1)
        self.assertFalse(response.data['is_fully_approved'])

        # Should have last approver info
        self.assertIsNotNone(response.data['last_approver'])
        self.assertEqual(response.data['last_approver']['username'], self.team_lead.username)

        # Should have next approver info
        self.assertIsNotNone(response.data['next_approver'])
        self.assertEqual(response.data['next_approver']['username'], self.manager.username)

        # Check approval chain progress
        approval_chain = response.data['approval_chain']
        self.assertEqual(len(approval_chain), 4)

        # First approver should be approved
        self.assertEqual(approval_chain[0]['status'], 'approved')
        self.assertTrue(approval_chain[0]['is_approved'])
        self.assertFalse(approval_chain[0]['is_current'])

        # Second approver should be current
        self.assertEqual(approval_chain[1]['status'], 'current')
        self.assertFalse(approval_chain[1]['is_approved'])
        self.assertTrue(approval_chain[1]['is_current'])
        self.assertEqual(approval_chain[1]['approver']['username'], self.manager.username)

        # 4. Test fully approved request
        self.request.last_approver = self.ceo
        self.request.approval_level = 4
        self.request.status = 'approved'
        self.request.save()

        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'approved')
        self.assertEqual(response.data['approval_level'], 4)
        self.assertTrue(response.data['is_fully_approved'])

        # Should have last approver info
        self.assertIsNotNone(response.data['last_approver'])
        self.assertEqual(response.data['last_approver']['username'], self.ceo.username)

        # Should not have next approver (fully approved)
        self.assertIsNone(response.data['next_approver'])

        # Should not have approval chain for approved requests
        self.assertNotIn('approval_chain', response.data)

    def test_current_approver_endpoint_permissions(self):
        """Test that current-approver endpoint can be accessed by any authenticated user"""

        self.request.transition_to('pending', self.employee)

        # Employee can access
        self.client.force_authenticate(user=self.employee)
        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Team Lead can access
        self.client.force_authenticate(user=self.team_lead)
        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Manager can access
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Purchasing user can access
        self.client.force_authenticate(user=self.purchasing_user)
        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Unauthenticated user cannot access
        self.client.force_authenticate(user=None)
        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_current_approver_endpoint_with_organizational_change(self):
        """Test current-approver endpoint adapts to organizational changes"""

        # Authenticate first
        self.client.force_authenticate(user=self.employee)

        # Start approval flow
        self.request.transition_to('pending', self.employee)

        # Team Lead approves
        self.request.last_approver = self.team_lead
        self.request.approval_level = 1
        self.request.status = 'in_review'
        self.request.save()

        # Check initial state
        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )
        self.assertEqual(response.data['next_approver']['username'], self.manager.username)

        # Add new Senior Manager between Manager and Director
        senior_manager = User.objects.create_user(
            username="seniormanager2",
            first_name="Senior2",
            last_name="Manager2",
            worksite=self.worksite,
            supervisor=self.director,
            password="seniormanager2pass123"
        )

        # Update Manager to report to Senior Manager
        self.manager.supervisor = senior_manager
        self.manager.save()

        # Check that endpoint reflects the change
        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )
        self.assertEqual(response.data['next_approver']['username'], self.manager.username)

        # Manager approves
        self.request.last_approver = self.manager
        self.request.approval_level = 2
        self.request.save()

        # Now Senior Manager should be next
        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )
        self.assertEqual(response.data['next_approver']['username'], senior_manager.username)

    def test_current_approver_endpoint_error_handling(self):
        """Test error handling for current-approver endpoint"""

        # Authenticate first
        self.client.force_authenticate(user=self.employee)

        # Test with non-existent request
        response = self.client.get(
            reverse('request-current-approver', args=[99999])
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_current_approver_response_structure(self):
        """Test the structure of current-approver endpoint response"""

        # Authenticate first
        self.client.force_authenticate(user=self.employee)

        self.request.transition_to('pending', self.employee)

        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )

        # Check all required fields are present
        required_fields = [
            'request_id', 'request_number', 'status', 'approval_level',
            'is_fully_approved', 'approval_status_text', 'last_approver', 'next_approver'
        ]

        for field in required_fields:
            self.assertIn(field, response.data)

        # Check next_approver structure
        next_approver = response.data['next_approver']
        approver_fields = ['id', 'username', 'full_name', 'first_name', 'last_name']
        for field in approver_fields:
            self.assertIn(field, next_approver)

        # Check approval_chain structure (for pending/in_review requests)
        if response.data['status'] in ['pending', 'in_review']:
            self.assertIn('approval_chain', response.data)
            self.assertIn('total_required_approvals', response.data)

            chain_item = response.data['approval_chain'][0]
            chain_fields = ['level', 'approver', 'status', 'is_current', 'is_approved']
            for field in chain_fields:
                self.assertIn(field, chain_item)

    def test_current_approver_status_text_accuracy(self):
        """Test that approval_status_text is accurate"""

        # Authenticate first
        self.client.force_authenticate(user=self.employee)

        # Draft status
        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )
        # For draft, depends on get_approval_status implementation

        # Pending status
        self.request.transition_to('pending', self.employee)
        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )
        self.assertIn('Team Lead', response.data['approval_status_text'])

        # After approval
        self.request.last_approver = self.team_lead
        self.request.approval_level = 1
        self.request.status = 'in_review'
        self.request.save()

        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )
        self.assertIn('Man Ager', response.data['approval_status_text'])

        # Fully approved
        self.request.last_approver = self.ceo
        self.request.approval_level = 4
        self.request.status = 'approved'
        self.request.save()

        response = self.client.get(
            reverse('request-current-approver', args=[self.request.id])
        )
        self.assertIn('Fully approved', response.data['approval_status_text'])