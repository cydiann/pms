"""
Model tests for PMS system
Tests all model functionality, relationships, and business logic
"""
from django.test import TestCase
from django.contrib.auth.models import Group, Permission
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from authentication.models import User, PasswordResetRequest
from organization.models import Worksite, Division
from requests.models import Request, ApprovalHistory, RequestRevision


class UserModelTests(TestCase):
    """Test User model functionality"""
    
    def setUp(self):
        self.worksite = Worksite.objects.create(
            address="123 Test St",
            city="Test City",
            country="USA"
        )
        
        # Create groups
        self.admin_group = Group.objects.create(name="Administrator")
        self.supervisor_group = Group.objects.create(name="Supervisor") 
        self.employee_group = Group.objects.create(name="Employee")
        
    def test_user_creation(self):
        """Test basic user creation"""
        user = User.objects.create_user(
            username="testuser",
            password="testpass123",
            first_name="Test",
            last_name="User",
            worksite=self.worksite
        )
        
        self.assertEqual(user.username, "testuser")
        self.assertEqual(user.get_full_name(), "Test User")
        self.assertTrue(user.check_password("testpass123"))
        self.assertEqual(user.worksite, self.worksite)
        self.assertIsNotNone(user.created_at)
        
    def test_superuser_creation(self):
        """Test superuser creation"""
        admin = User.objects.create_superuser(
            username="admin",
            password="adminpass123",
            first_name="Admin",
            last_name="User"
        )
        
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_staff)
        
    def test_supervisor_hierarchy(self):
        """Test supervisor hierarchy relationships"""
        ceo = User.objects.create_user(username="ceo", password="pass123")
        manager = User.objects.create_user(
            username="manager", 
            password="pass123",
            supervisor=ceo
        )
        employee = User.objects.create_user(
            username="employee",
            password="pass123", 
            supervisor=manager
        )
        
        # Test hierarchy chain
        chain = employee.get_hierarchy_chain()
        self.assertEqual(len(chain), 3)
        self.assertEqual(chain[0], employee)
        self.assertEqual(chain[1], manager)
        self.assertEqual(chain[2], ceo)
        
        # Test subordinates
        subordinates = ceo.get_all_subordinates()
        self.assertIn(manager, subordinates)
        self.assertIn(employee, subordinates)
        
    def test_role_name_with_groups(self):
        """Test get_role_name method with groups"""
        user = User.objects.create_user(username="test", password="pass123")
        
        # No groups - should return Employee
        self.assertEqual(user.get_role_name(), "Employee")
        
        # With group - should return group name
        user.groups.add(self.supervisor_group)
        self.assertEqual(user.get_role_name(), "Supervisor")
        
    def test_user_permissions(self):
        """Test user permission inheritance"""
        user = User.objects.create_user(username="test", password="pass123")
        
        # Add permission to group  
        permission = Permission.objects.get(codename='add_user', content_type__app_label='authentication')
        self.supervisor_group.permissions.add(permission)
        
        # User should not have permission yet
        self.assertFalse(user.has_perm('authentication.add_user'))
        
        # Add user to group
        user.groups.add(self.supervisor_group)
        
        # Get a fresh user instance from the database to avoid cached permissions
        fresh_user = User.objects.get(id=user.id)
        
        # User should now have permission through group
        self.assertTrue(fresh_user.has_perm('authentication.add_user'))


class WorksiteModelTests(TestCase):
    """Test Worksite model functionality"""
    
    def test_worksite_creation(self):
        """Test worksite creation and string representation"""
        worksite = Worksite.objects.create(
            address="456 Construction Ave",
            city="Build City", 
            country="Canada"
        )
        
        self.assertEqual(str(worksite), "Build City, Canada")
        self.assertEqual(worksite.address, "456 Construction Ave")
        
    def test_worksite_chief_relationship(self):
        """Test worksite chief assignment"""
        worksite = Worksite.objects.create(
            address="789 Site Rd",
            city="Chief City",
            country="USA"
        )
        
        chief = User.objects.create_user(
            username="chief",
            password="pass123"
        )
        
        worksite.chief = chief
        worksite.save()
        
        self.assertEqual(worksite.chief, chief)
        self.assertEqual(chief.worksite_chief.first(), worksite)


class DivisionModelTests(TestCase):
    """Test Division model functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username="creator",
            password="pass123"
        )
        self.worksite1 = Worksite.objects.create(
            address="Site 1", city="City 1", country="USA"
        )
        self.worksite2 = Worksite.objects.create(
            address="Site 2", city="City 2", country="USA"
        )
        
    def test_division_creation(self):
        """Test division creation"""
        division = Division.objects.create(
            name="Engineering",
            created_by=self.user
        )
        
        self.assertEqual(str(division), "Engineering")
        self.assertEqual(division.created_by, self.user)
        
    def test_division_worksites_relationship(self):
        """Test many-to-many relationship with worksites"""
        division = Division.objects.create(
            name="Safety",
            created_by=self.user
        )
        
        division.worksites.add(self.worksite1, self.worksite2)
        
        self.assertEqual(division.worksites.count(), 2)
        self.assertIn(self.worksite1, division.worksites.all())
        self.assertIn(self.worksite2, division.worksites.all())


class RequestModelTests(TestCase):
    """Test Request model functionality and state machine"""
    
    def setUp(self):
        self.worksite = Worksite.objects.create(
            address="Test Site", city="Test City", country="USA"
        )
        
        # Create hierarchy: CEO -> Manager -> Employee
        self.ceo = User.objects.create_user(
            username="ceo", password="pass123", worksite=self.worksite
        )
        self.manager = User.objects.create_user(
            username="manager", password="pass123", 
            supervisor=self.ceo, worksite=self.worksite
        )
        self.employee = User.objects.create_user(
            username="employee", password="pass123",
            supervisor=self.manager, worksite=self.worksite
        )
        
    def test_request_creation(self):
        """Test basic request creation"""
        request = Request.objects.create(
            request_number="REQ-001",
            item="Office Chair",
            description="Ergonomic office chair",
            created_by=self.employee,
            quantity=1.00,
            unit="pieces",
            category="Furniture"
        )
        
        self.assertEqual(request.status, 'draft')
        self.assertEqual(request.created_by, self.employee)
        self.assertEqual(str(request), "REQ-001 - Office Chair")
        
    def test_approval_chain(self):
        """Test approval chain generation"""
        request = Request.objects.create(
            request_number="REQ-002",
            item="Test Item",
            created_by=self.employee,
            quantity=1.00,
            unit="pieces"
        )
        
        chain = request.get_approval_chain()
        self.assertEqual(len(chain), 2)  # manager -> ceo
        self.assertEqual(chain[0], self.manager)
        self.assertEqual(chain[1], self.ceo)
        
    def test_next_approver(self):
        """Test next approver logic"""
        request = Request.objects.create(
            request_number="REQ-003",
            item="Test Item",
            created_by=self.employee,
            quantity=1.00,
            unit="pieces"
        )
        
        # Draft state - next approver is immediate supervisor
        next_approver = request.get_next_approver()
        self.assertEqual(next_approver, self.manager)
        
        # Transition to pending and set current approver to manager
        request.transition_to('pending', self.employee, "Submitting for approval")
        request.current_approver = self.manager
        request.save()
        
        # Next approver should be CEO
        next_approver = request.get_next_approver()
        self.assertEqual(next_approver, self.ceo)
        
    def test_state_machine_valid_transitions(self):
        """Test valid state transitions"""
        request = Request.objects.create(
            request_number="REQ-004",
            item="Test Item",
            created_by=self.employee,
            quantity=1.00,
            unit="pieces"
        )
        
        # Test valid transitions from draft
        valid_transitions = request.get_valid_transitions()
        self.assertEqual(valid_transitions, ['pending'])
        
        # Test can_transition_to
        self.assertTrue(request.can_transition_to('pending'))
        self.assertFalse(request.can_transition_to('approved'))
        
    def test_state_machine_transition_to(self):
        """Test state transition with history logging"""
        request = Request.objects.create(
            request_number="REQ-005",
            item="Test Item",
            created_by=self.employee,
            quantity=1.00,
            unit="pieces"
        )
        
        # Valid transition
        result = request.transition_to('pending', self.employee, "Submitting request")
        self.assertTrue(result)
        self.assertEqual(request.status, 'pending')
        
        # Check approval history was created
        history = ApprovalHistory.objects.filter(request=request).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.action, 'submitted')
        self.assertEqual(history.user, self.employee)
        self.assertEqual(history.notes, "Submitting request")
        
    def test_state_machine_invalid_transition(self):
        """Test invalid state transition raises error"""
        request = Request.objects.create(
            request_number="REQ-006",
            item="Test Item",
            created_by=self.employee,
            quantity=1.00,
            unit="pieces"
        )
        
        # Invalid transition from draft to approved
        with self.assertRaises(ValueError):
            request.transition_to('approved', self.employee)
            
    def test_approval_level_calculation(self):
        """Test approval level calculation"""
        request = Request.objects.create(
            request_number="REQ-007",
            item="Test Item",
            created_by=self.employee,
            quantity=1.00,
            unit="pieces"
        )
        
        # Manager is level 1, CEO is level 2
        manager_level = request.get_approval_level(self.manager)
        ceo_level = request.get_approval_level(self.ceo)
        
        self.assertEqual(manager_level, 1)
        self.assertEqual(ceo_level, 2)
        
        # User not in chain returns 0
        other_user = User.objects.create_user(username="other", password="pass123")
        other_level = request.get_approval_level(other_user)
        self.assertEqual(other_level, 0)


class ApprovalHistoryModelTests(TestCase):
    """Test ApprovalHistory model functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(username="approver", password="pass123")
        self.request = Request.objects.create(
            request_number="REQ-HIST-001",
            item="Test Item",
            created_by=self.user,
            quantity=1.00,
            unit="pieces"
        )
        
    def test_approval_history_creation(self):
        """Test approval history creation"""
        history = ApprovalHistory.objects.create(
            request=self.request,
            user=self.user,
            action='submitted',
            level=1,
            notes='Test submission'
        )
        
        self.assertEqual(history.request, self.request)
        self.assertEqual(history.user, self.user)
        self.assertEqual(history.action, 'submitted')
        self.assertEqual(history.level, 1)
        self.assertIsNotNone(history.created_at)
        
        expected_str = f"{self.request.request_number} - submitted by {self.user} (Level 1)"
        self.assertEqual(str(history), expected_str)


class PasswordResetRequestModelTests(TestCase):
    """Test PasswordResetRequest model functionality"""
    
    def setUp(self):
        self.supervisor = User.objects.create_user(
            username="supervisor", password="pass123"
        )
        self.employee = User.objects.create_user(
            username="employee", password="pass123",
            supervisor=self.supervisor
        )
        
    def test_password_reset_creation(self):
        """Test password reset request creation"""
        reset_request = PasswordResetRequest.objects.create(
            user=self.employee,
            supervisor=self.supervisor,
            reason="Forgot password",
            status='pending'
        )
        
        self.assertEqual(reset_request.user, self.employee)
        self.assertEqual(reset_request.supervisor, self.supervisor)
        self.assertEqual(reset_request.status, 'pending')
        self.assertIsNotNone(reset_request.created_at)
        
        expected_str = f"Password reset for {self.employee} - pending"
        self.assertEqual(str(reset_request), expected_str)


class RequestRevisionModelTests(TestCase):
    """Test RequestRevision model functionality"""
    
    def setUp(self):
        self.supervisor = User.objects.create_user(
            username="supervisor", password="pass123"
        )
        self.employee = User.objects.create_user(
            username="employee", password="pass123"
        )
        self.request = Request.objects.create(
            request_number="REQ-REV-001",
            item="Test Item",
            created_by=self.employee,
            quantity=1.00,
            unit="pieces"
        )
        
    def test_request_revision_creation(self):
        """Test request revision creation"""
        revision = RequestRevision.objects.create(
            request=self.request,
            revision_number=1,
            requested_by=self.supervisor,
            reason="Need more details",
            upper_management_notes="Please specify exact model"
        )
        
        self.assertEqual(revision.request, self.request)
        self.assertEqual(revision.revision_number, 1)
        self.assertEqual(revision.requested_by, self.supervisor)
        self.assertIsNotNone(revision.created_at)
        
        expected_str = f"{self.request.request_number} - Revision #1"
        self.assertEqual(str(revision), expected_str)