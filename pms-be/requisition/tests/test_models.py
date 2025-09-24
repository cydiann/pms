from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from decimal import Decimal
from requisition.models import Request, ApprovalHistory, AuditLog
from organization.models import Worksite, Division

User = get_user_model()


class RequestModelTest(TestCase):
    """Test cases for Request model"""
    
    def setUp(self):
        """Set up test data"""
        # Create worksite and division
        self.worksite = Worksite.objects.create(
            address="123 Test St",
            city="Test City",
            country="Turkey"
        )
        
        # Create admin user first for Division.created_by
        self.admin_user = User.objects.create_superuser(
            username="testadmin",
            first_name="Test", 
            last_name="Admin",
            password="adminpass123"
        )
        
        self.division = Division.objects.create(
            name="Test Division",
            created_by=self.admin_user
        )
        
        # Create users with hierarchy
        self.ceo = User.objects.create_user(
            username="ceo",
            first_name="Chief",
            last_name="Executive",
            worksite=self.worksite,
            password="testpass123"
        )
        
        self.manager = User.objects.create_user(
            username="manager",
            first_name="Man",
            last_name="Ager",
            supervisor=self.ceo,
            worksite=self.worksite,
            password="testpass123"
        )
        
        self.employee = User.objects.create_user(
            username="employee",
            first_name="Emp",
            last_name="Loyee",
            supervisor=self.manager,
            worksite=self.worksite,
            password="testpass123"
        )
    
    def test_create_request(self):
        """Test creating a basic request"""
        request = Request.objects.create(
            item="Office Chair",
            description="Ergonomic office chair for workstation",
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit="pieces",
            category="Office Furniture",
            delivery_address="Main Office, Floor 2",
            reason="Current chair is broken"
        )
        
        self.assertIsNotNone(request.request_number)
        self.assertTrue(request.request_number.startswith('REQ-'))
        self.assertEqual(request.item, "Office Chair")
        self.assertEqual(request.created_by, self.employee)
        self.assertEqual(request.status, 'draft')  # Default status
        self.assertEqual(request.revision_count, 0)
    
    def test_request_number_generation(self):
        """Test request number is auto-generated and unique"""
        request1 = Request.objects.create(
            item="Item 1",
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit="pieces"
        )
        
        request2 = Request.objects.create(
            item="Item 2", 
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit="pieces"
        )
        
        self.assertIsNotNone(request1.request_number)
        self.assertIsNotNone(request2.request_number)
        self.assertNotEqual(request1.request_number, request2.request_number)
    
    def test_get_approval_chain(self):
        """Test get_approval_chain method"""
        request = Request.objects.create(
            item="Test Item",
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit="pieces"
        )
        
        chain = request.get_approval_chain()
        
        self.assertEqual(len(chain), 2)
        self.assertEqual(chain[0], self.manager)  # Immediate supervisor
        self.assertEqual(chain[1], self.ceo)      # Top of hierarchy
    
    def test_get_next_approver(self):
        """Test get_next_approver method"""
        request = Request.objects.create(
            item="Test Item",
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit="pieces"
        )
        
        # For draft request, next approver is immediate supervisor
        next_approver = request.get_next_approver()
        self.assertEqual(next_approver, self.manager)
        
        # After submitting request (transitions to pending status)
        request.transition_to('pending', self.employee)
        # Still pending manager approval - next approver should still be manager
        next_approver = request.get_next_approver()
        self.assertEqual(next_approver, self.manager)

        # After manager approves, next approver should be CEO
        request.last_approver = self.manager
        request.approval_level = 1
        request.save()
        next_approver = request.get_next_approver()
        self.assertEqual(next_approver, self.ceo)
    
    def test_valid_status_transitions(self):
        """Test get_valid_transitions method"""
        request = Request.objects.create(
            item="Test Item",
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit="pieces"
        )
        
        # Draft status transitions
        draft_transitions = request.get_valid_transitions()
        self.assertEqual(draft_transitions, ['pending'])
        
        # Pending status transitions
        request.status = 'pending'
        pending_transitions = request.get_valid_transitions()
        expected = ['in_review', 'approved', 'rejected', 'revision_requested']
        self.assertEqual(set(pending_transitions), set(expected))
        
        # Completed status (final state)
        request.status = 'completed'
        completed_transitions = request.get_valid_transitions()
        self.assertEqual(completed_transitions, [])
    
    def test_can_transition_to(self):
        """Test can_transition_to method"""
        request = Request.objects.create(
            item="Test Item",
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit="pieces"
        )
        
        # Valid transition from draft
        self.assertTrue(request.can_transition_to('pending'))
        
        # Invalid transition from draft
        self.assertFalse(request.can_transition_to('approved'))
        self.assertFalse(request.can_transition_to('completed'))
    
    def test_transition_to_method(self):
        """Test transition_to method"""
        request = Request.objects.create(
            item="Test Item",
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit="pieces"
        )
        
        # Valid transition
        result = request.transition_to('pending', self.employee, "Submitting request")
        
        self.assertTrue(result)
        self.assertEqual(request.status, 'pending')
        
        # Check approval history was created
        history = ApprovalHistory.objects.filter(request=request).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.user, self.employee)
        self.assertEqual(history.action, 'submitted')
        self.assertEqual(history.notes, 'Submitting request')
    
    def test_invalid_transition_raises_error(self):
        """Test invalid transition raises ValueError"""
        request = Request.objects.create(
            item="Test Item",
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit="pieces"
        )
        
        with self.assertRaises(ValueError):
            request.transition_to('completed', self.employee)  # Invalid from draft
    
    def test_get_approval_level(self):
        """Test get_approval_level method"""
        request = Request.objects.create(
            item="Test Item",
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit="pieces"
        )
        
        # Manager is level 1 (immediate supervisor)
        manager_level = request.get_approval_level(self.manager)
        self.assertEqual(manager_level, 1)
        
        # CEO is level 2
        ceo_level = request.get_approval_level(self.ceo)
        self.assertEqual(ceo_level, 2)
        
        # User not in chain returns 0
        other_level = request.get_approval_level(self.employee)
        self.assertEqual(other_level, 0)
    
    def test_request_str_method(self):
        """Test request string representation"""
        request = Request.objects.create(
            item="Test Item",
            created_by=self.employee,
            quantity=Decimal('1.00'),
            unit="pieces"
        )
        
        expected = f"{request.request_number} - Test Item"
        self.assertEqual(str(request), expected)


class ApprovalHistoryModelTest(TestCase):
    """Test cases for ApprovalHistory model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username="testuser",
            first_name="Test",
            last_name="User",
            password="testpass123"
        )
        
        self.request = Request.objects.create(
            item="Test Item",
            created_by=self.user,
            quantity=Decimal('1.00'),
            unit="pieces"
        )
    
    def test_create_approval_history(self):
        """Test creating approval history"""
        history = ApprovalHistory.objects.create(
            request=self.request,
            user=self.user,
            action='submitted',
            level=1,
            notes="Request submitted for approval"
        )
        
        self.assertEqual(history.request, self.request)
        self.assertEqual(history.user, self.user)
        self.assertEqual(history.action, 'submitted')
        self.assertEqual(history.level, 1)
        self.assertEqual(history.notes, "Request submitted for approval")
        self.assertIsNotNone(history.created_at)
    
    def test_approval_history_ordering(self):
        """Test approval history is ordered by created_at desc"""
        # Create multiple history entries
        history1 = ApprovalHistory.objects.create(
            request=self.request,
            user=self.user,
            action='submitted',
            level=1
        )
        
        history2 = ApprovalHistory.objects.create(
            request=self.request,
            user=self.user,
            action='approved',
            level=1
        )
        
        # Get all history for request
        all_history = ApprovalHistory.objects.filter(request=self.request)
        
        # Should be ordered newest first
        self.assertEqual(all_history[0], history2)  # Most recent first
        self.assertEqual(all_history[1], history1)
    
    def test_approval_history_str_method(self):
        """Test approval history string representation"""
        history = ApprovalHistory.objects.create(
            request=self.request,
            user=self.user,
            action='approved',
            level=1
        )
        
        expected = f"{self.request.request_number} - approved by {self.user} (Level 1)"
        self.assertEqual(str(history), expected)


class AuditLogModelTest(TestCase):
    """Test cases for AuditLog model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username="testuser",
            first_name="Test",
            last_name="User",
            password="testpass123"
        )
    
    def test_create_audit_log(self):
        """Test creating audit log"""
        log = AuditLog.objects.create(
            user=self.user,
            table_name='requests_request',
            record_id=1,
            action='CREATE',
            old_values=None,
            new_values={'status': 'draft', 'item': 'Test Item'}
        )
        
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.table_name, 'requests_request')
        self.assertEqual(log.record_id, 1)
        self.assertEqual(log.action, 'CREATE')
        self.assertIsNone(log.old_values)
        self.assertEqual(log.new_values['item'], 'Test Item')
        self.assertIsNotNone(log.timestamp)
    
    def test_audit_log_str_method(self):
        """Test audit log string representation"""
        log = AuditLog.objects.create(
            user=self.user,
            table_name='requests_request',
            record_id=1,
            action='UPDATE'
        )
        
        expected = f"{self.user} - UPDATE requests_request:1"
        self.assertEqual(str(log), expected)