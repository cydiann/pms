from django.test import TestCase
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from rest_framework.test import APITestCase
from rest_framework import status
from authentication.models import User
from organization.models import Worksite
from requisition.models import Request, ApprovalHistory


class RequestPermissionTests(TestCase):
    """Test permission logic for request operations"""

    def setUp(self):
        """Set up test data"""
        self.worksite = Worksite.objects.create(
            city="Test City",
            address="Test Address",
            country="Test Country"
        )

        # Create user hierarchy
        self.ceo = User.objects.create_user(
            username='ceo',
            first_name='Chief',
            last_name='Executive',
            worksite=self.worksite,
            is_superuser=True
        )

        self.manager = User.objects.create_user(
            username='manager',
            first_name='Middle',
            last_name='Manager',
            worksite=self.worksite,
            supervisor=self.ceo
        )

        self.employee = User.objects.create_user(
            username='employee',
            first_name='Team',
            last_name='Member',
            worksite=self.worksite,
            supervisor=self.manager
        )

        self.purchasing_agent = User.objects.create_user(
            username='purchasing',
            first_name='Purchase',
            last_name='Agent',
            worksite=self.worksite
        )

        # Create purchasing group
        self.purchasing_group, created = Group.objects.get_or_create(name='Purchasing')
        self.purchasing_agent.groups.add(self.purchasing_group)

        # Create test request
        self.request = Request.objects.create(
            item='Test Item',
            description='Test Description',
            quantity=1.0,
            unit='pieces',
            category='Test Category',
            delivery_address='Test Address',
            reason='Test Reason',
            created_by=self.employee,
            request_number='TEST-2024-001'
        )

    def test_approval_chain_logic(self):
        """Test that approval chain is calculated correctly"""
        approval_chain = self.request.get_approval_chain()

        # Should be [manager, ceo] for employee's request
        self.assertEqual(len(approval_chain), 2)
        self.assertEqual(approval_chain[0], self.manager)
        self.assertEqual(approval_chain[1], self.ceo)

    def test_next_approver_logic(self):
        """Test next approver calculation"""
        # Initially, next approver should be immediate supervisor
        next_approver = self.request.get_next_approver()
        self.assertEqual(next_approver, self.manager)

        # After manager approves, next should be CEO
        self.request.last_approver = self.manager
        self.request.save()

        next_approver = self.request.get_next_approver()
        self.assertEqual(next_approver, self.ceo)

        # After CEO approves, should be None (fully approved)
        self.request.last_approver = self.ceo
        self.request.save()

        next_approver = self.request.get_next_approver()
        self.assertIsNone(next_approver)

    def test_is_fully_approved_logic(self):
        """Test fully approved detection"""
        # Initially not approved
        self.assertFalse(self.request.is_fully_approved())

        # After setting approval level but no last approver
        self.request.approval_level = 1
        self.request.save()
        self.assertFalse(self.request.is_fully_approved())

        # After CEO approves (top of chain)
        self.request.last_approver = self.ceo
        self.request.approval_level = 2
        self.request.save()
        self.assertTrue(self.request.is_fully_approved())

    def test_status_transitions(self):
        """Test valid status transitions"""
        # Draft can go to pending
        self.assertTrue(self.request.can_transition_to('pending'))
        self.assertFalse(self.request.can_transition_to('approved'))

        # Move to pending
        self.request.transition_to('pending', self.employee)
        self.assertEqual(self.request.status, 'pending')

        # Pending can go to in_review, approved, rejected, or revision_requested
        self.assertTrue(self.request.can_transition_to('in_review'))
        self.assertTrue(self.request.can_transition_to('approved'))
        self.assertTrue(self.request.can_transition_to('rejected'))
        self.assertTrue(self.request.can_transition_to('revision_requested'))

        # Move to approved
        self.request.transition_to('approved', self.manager)
        self.assertEqual(self.request.status, 'approved')

        # Approved can go to purchasing or be rejected
        self.assertTrue(self.request.can_transition_to('purchasing'))
        self.assertTrue(self.request.can_transition_to('rejected'))
        self.assertFalse(self.request.can_transition_to('draft'))

    def test_purchasing_workflow_permissions(self):
        """Test that only purchasing users can perform purchasing actions"""
        # Set request to approved status
        self.request.status = 'approved'
        self.request.save()

        # Test can_purchase method
        self.assertFalse(self.employee.can_purchase())
        self.assertFalse(self.manager.can_purchase())
        self.assertTrue(self.ceo.can_purchase())  # Admin can purchase
        self.assertTrue(self.purchasing_agent.can_purchase())

        # Test document upload permissions
        from requisition.models import ProcurementDocument
        import uuid

        doc = ProcurementDocument.objects.create(
            request=self.request,
            document_type='quote',
            file_name='test.pdf',
            file_size=1000,
            file_type='application/pdf',
            object_name=str(uuid.uuid4())
        )

        # Only purchasing users and admins can upload
        self.assertFalse(doc.can_upload_document(self.employee))
        self.assertFalse(doc.can_upload_document(self.manager))
        self.assertTrue(doc.can_upload_document(self.ceo))
        self.assertTrue(doc.can_upload_document(self.purchasing_agent))


class RequestAPIPermissionTests(APITestCase):
    """Test API endpoint permissions"""

    def setUp(self):
        """Set up test data for API tests"""
        self.worksite = Worksite.objects.create(
            city="Test City",
            address="Test Address",
            country="Test Country"
        )

        # Create users
        self.admin = User.objects.create_user(
            username='admin',
            first_name='Admin',
            last_name='User',
            worksite=self.worksite,
            is_superuser=True
        )

        self.supervisor = User.objects.create_user(
            username='supervisor',
            first_name='Super',
            last_name='Visor',
            worksite=self.worksite
        )

        self.employee = User.objects.create_user(
            username='employee',
            first_name='Emp',
            last_name='Loyee',
            worksite=self.worksite,
            supervisor=self.supervisor
        )

        self.purchasing_user = User.objects.create_user(
            username='purchasing',
            first_name='Purchase',
            last_name='Agent',
            worksite=self.worksite
        )

        # Add to purchasing group
        purchasing_group, created = Group.objects.get_or_create(name='Purchasing')
        self.purchasing_user.groups.add(purchasing_group)

        # Create test requests
        self.employee_request = Request.objects.create(
            item='Employee Request',
            description='Test',
            quantity=1.0,
            unit='pieces',
            category='Test',
            delivery_address='Test',
            reason='Test',
            created_by=self.employee,
            request_number='EMP-2024-001'
        )

        self.supervisor_request = Request.objects.create(
            item='Supervisor Request',
            description='Test',
            quantity=1.0,
            unit='pieces',
            category='Test',
            delivery_address='Test',
            reason='Test',
            created_by=self.supervisor,
            request_number='SUP-2024-001'
        )

    def test_user_role_info_endpoint(self):
        """Test the user role info API endpoint"""
        # Test as employee
        self.client.force_authenticate(user=self.employee)
        response = self.client.get('/api/auth/users/role-info/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        expected = {
            'has_subordinates': False,
            'can_purchase': False,
            'can_view_all_requests': False,
            'is_admin': False,
            'subordinate_count': 0,
        }
        self.assertEqual(data, expected)

        # Test as supervisor
        self.client.force_authenticate(user=self.supervisor)
        response = self.client.get('/api/auth/users/role-info/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        expected = {
            'has_subordinates': True,
            'can_purchase': False,
            'can_view_all_requests': False,
            'is_admin': False,
            'subordinate_count': 1,
        }
        self.assertEqual(data, expected)

        # Test as admin
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/auth/users/role-info/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        expected = {
            'has_subordinates': False,
            'can_purchase': True,
            'can_view_all_requests': True,
            'is_admin': True,
            'subordinate_count': 0,
        }
        self.assertEqual(data, expected)

    def test_my_requests_endpoint(self):
        """Test that users only see their own requests"""
        # Employee should see their request (and possibly others from other tests)
        self.client.force_authenticate(user=self.employee)
        response = self.client.get('/api/requests/my-requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        # Handle both paginated and non-paginated responses
        if isinstance(data, dict) and 'results' in data:
            requests = data['results']
        else:
            requests = data

        # Check that employee's request is in the response
        request_ids = [r['id'] for r in requests]
        self.assertIn(self.employee_request.id, request_ids)
        # Ensure employee only sees requests they created
        for request in requests:
            self.assertEqual(request.get('created_by'), self.employee.id)

        # Supervisor should see their request
        self.client.force_authenticate(user=self.supervisor)
        response = self.client.get('/api/requests/my-requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        # Handle both paginated and non-paginated responses
        if isinstance(data, dict) and 'results' in data:
            requests = data['results']
        else:
            requests = data

        request_ids = [r['id'] for r in requests]
        self.assertIn(self.supervisor_request.id, request_ids)
        # Ensure supervisor only sees requests they created
        for request in requests:
            self.assertEqual(request.get('created_by'), self.supervisor.id)

    def test_pending_approvals_endpoint(self):
        """Test pending approvals endpoint shows correct requests"""
        # Set employee request to pending
        self.employee_request.status = 'pending'
        self.employee_request.save()

        # Supervisor should see employee's pending request
        self.client.force_authenticate(user=self.supervisor)
        response = self.client.get('/api/requests/pending-approvals/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        # Handle both paginated and non-paginated responses
        if isinstance(data, dict) and 'results' in data:
            requests = data['results']
        else:
            requests = data

        # Check that the employee's request is in pending approvals for supervisor
        request_ids = [r['id'] for r in requests]
        self.assertIn(self.employee_request.id, request_ids)

        # Employee should not see any pending approvals (they don't approve their own requests)
        self.client.force_authenticate(user=self.employee)
        response = self.client.get('/api/requests/pending-approvals/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        # Handle both paginated and non-paginated responses
        if isinstance(data, dict) and 'results' in data:
            requests = data['results']
        else:
            requests = data

        # Employee shouldn't see their own request in pending approvals
        request_ids = [r['id'] for r in requests]
        self.assertNotIn(self.employee_request.id, request_ids)

    def test_purchasing_queue_endpoint_permissions(self):
        """Test purchasing queue endpoint access permissions"""
        # Set request to approved
        self.employee_request.status = 'approved'
        self.employee_request.save()

        # Regular employee should be forbidden
        self.client.force_authenticate(user=self.employee)
        response = self.client.get('/api/requests/purchasing-queue/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Supervisor should be forbidden
        self.client.force_authenticate(user=self.supervisor)
        response = self.client.get('/api/requests/purchasing-queue/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Purchasing user should have access
        self.client.force_authenticate(user=self.purchasing_user)
        response = self.client.get('/api/requests/purchasing-queue/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        # Handle both paginated and non-paginated responses
        if isinstance(data, dict) and 'results' in data:
            requests = data['results']
        else:
            requests = data

        # Check that the approved request is in the purchasing queue
        request_ids = [r['id'] for r in requests]
        self.assertIn(self.employee_request.id, request_ids)
        # Verify all requests are approved or in purchasing status
        for request in requests:
            self.assertIn(request['status'], ['approved', 'purchasing'])

        # Admin should have access
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/requests/purchasing-queue/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_purchasing_actions_permissions(self):
        """Test purchasing action endpoints (mark purchased, delivered)"""
        # Set request to approved
        self.employee_request.status = 'approved'
        self.employee_request.save()

        # Test mark as purchased - should fail for regular users
        self.client.force_authenticate(user=self.employee)
        response = self.client.post(f'/api/requests/{self.employee_request.id}/mark-purchased/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Should work for purchasing user
        self.client.force_authenticate(user=self.purchasing_user)
        response = self.client.post(f'/api/requests/{self.employee_request.id}/mark-purchased/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Refresh request
        self.employee_request.refresh_from_db()
        self.assertEqual(self.employee_request.status, 'ordered')

        # Test mark as delivered
        response = self.client.post(f'/api/requests/{self.employee_request.id}/mark-delivered/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.employee_request.refresh_from_db()
        self.assertEqual(self.employee_request.status, 'delivered')

    def test_all_requests_endpoint_admin_only(self):
        """Test that all requests endpoint is admin-only"""
        # Give admin permission
        content_type = ContentType.objects.get_for_model(Request)
        permission, _ = Permission.objects.get_or_create(
            codename='view_all_requests',
            name='Can view all requests system-wide',
            content_type=content_type,
        )
        self.admin.user_permissions.add(permission)

        # Regular users should see only their requests
        self.client.force_authenticate(user=self.employee)
        response = self.client.get('/api/requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        # Should only see own request
        if 'results' in data:
            request_ids = [r['id'] for r in data['results']]
        else:
            request_ids = [r['id'] for r in data]
        self.assertEqual(len(request_ids), 1)
        self.assertIn(self.employee_request.id, request_ids)

        # Admin should see all requests
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        if 'results' in data:
            request_ids = [r['id'] for r in data['results']]
        else:
            request_ids = [r['id'] for r in data]
        self.assertGreaterEqual(len(request_ids), 2)  # Should see both requests
        self.assertIn(self.employee_request.id, request_ids)
        self.assertIn(self.supervisor_request.id, request_ids)