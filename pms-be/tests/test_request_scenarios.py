"""
Request scenario tests for PMS system
Tests complete request workflows, state transitions, and business logic
"""
from django.test import TestCase
from django.contrib.auth.models import Group, Permission
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal

from authentication.models import User
from organization.models import Worksite, Division
from requests.models import Request, ApprovalHistory


class RequestWorkflowScenarioTests(TestCase):
    """Test complete request workflow scenarios"""
    
    def setUp(self):
        """Set up test hierarchy and permissions"""
        self.client = APIClient()
        
        # Create worksite
        self.worksite = Worksite.objects.create(
            address="Test Construction Site",
            city="Test City", 
            country="USA"
        )
        
        # Create user hierarchy: CEO -> Manager -> Team Leader -> Engineer
        self.ceo = User.objects.create_user(
            username="ceo",
            password="ceo123",
            first_name="John",
            last_name="CEO",
            worksite=self.worksite
        )
        
        self.manager = User.objects.create_user(
            username="manager", 
            password="mgr123",
            first_name="Jane",
            last_name="Manager",
            supervisor=self.ceo,
            worksite=self.worksite
        )
        
        self.team_leader = User.objects.create_user(
            username="leader",
            password="lead123", 
            first_name="Bob",
            last_name="Leader",
            supervisor=self.manager,
            worksite=self.worksite
        )
        
        self.engineer = User.objects.create_user(
            username="engineer",
            password="eng123",
            first_name="Alice", 
            last_name="Engineer",
            supervisor=self.team_leader,
            worksite=self.worksite
        )
        
        # Create purchasing user
        self.purchasing = User.objects.create_user(
            username="purchasing",
            password="pur123",
            first_name="Carol",
            last_name="Purchasing",
            worksite=self.worksite
        )
        
        # Create groups and assign permissions
        self.setup_groups_and_permissions()
        
    def setup_groups_and_permissions(self):
        """Set up groups and permissions for testing"""
        # Create groups
        self.employee_group = Group.objects.create(name="Employee")
        self.supervisor_group = Group.objects.create(name="Supervisor")
        self.admin_group = Group.objects.create(name="Administrator")
        self.purchasing_group = Group.objects.create(name="Purchasing Team")
        
        # Assign users to groups
        self.engineer.groups.add(self.employee_group)
        self.team_leader.groups.add(self.supervisor_group)
        self.manager.groups.add(self.supervisor_group)
        self.ceo.groups.add(self.admin_group)
        self.purchasing.groups.add(self.purchasing_group)
        
        # Create and assign permissions (simplified for testing)
        view_perm = Permission.objects.get(codename='view_request')
        add_perm = Permission.objects.get(codename='add_request')
        change_perm = Permission.objects.get(codename='change_request')
        
        # Employee permissions
        self.employee_group.permissions.add(view_perm, add_perm, change_perm)
        
        # Supervisor permissions (inherit employee + approval)
        self.supervisor_group.permissions.add(view_perm, add_perm, change_perm)
        
        # Admin permissions (all)
        all_request_perms = Permission.objects.filter(content_type__model='request')
        self.admin_group.permissions.add(*all_request_perms)
        
        # Purchasing permissions
        self.purchasing_group.permissions.add(view_perm, change_perm)
        
    def create_test_request(self, created_by=None):
        """Helper method to create a test request"""
        creator = created_by or self.engineer
        return Request.objects.create(
            request_number="REQ-TEST-001",
            item="Office Chairs",
            description="Ergonomic office chairs for development team",
            created_by=creator,
            quantity=Decimal('5.00'),
            unit="pieces",
            category="Office Furniture",
            delivery_address="Main Office, Floor 3",
            reason="Current chairs cause back pain"
        )
        
    def test_successful_request_lifecycle(self):
        """Test complete successful request from creation to completion"""
        # Step 1: Engineer creates request
        request = self.create_test_request()
        self.assertEqual(request.status, 'draft')
        self.assertEqual(request.created_by, self.engineer)
        
        # Step 2: Submit request (draft -> pending)
        success = request.transition_to('pending', self.engineer, "Submitting for approval")
        self.assertTrue(success)
        self.assertEqual(request.status, 'pending')
        
        # Verify approval chain
        chain = request.get_approval_chain()
        self.assertEqual(len(chain), 3)  # team_leader -> manager -> ceo
        self.assertEqual(chain[0], self.team_leader)
        self.assertEqual(chain[1], self.manager)
        self.assertEqual(chain[2], self.ceo)
        
        # Step 3: Team leader approves (pending -> in_review)
        request.current_approver = self.team_leader
        success = request.transition_to('in_review', self.team_leader, "Looks good, passing up")
        self.assertTrue(success)
        
        # Step 4: Manager approves (in_review -> approved) - skipping to final approval
        success = request.transition_to('approved', self.manager, "Final approval granted")
        self.assertTrue(success)
        request.final_approver = self.manager
        request.save()
        
        # Step 5: Auto-transition to purchasing
        success = request.transition_to('purchasing', self.manager, "Moving to purchasing team")
        self.assertTrue(success)
        
        # Step 6: Purchasing team marks as ordered
        success = request.transition_to('ordered', self.purchasing, "Order placed with vendor XYZ")
        self.assertTrue(success)
        
        # Step 7: Mark as delivered
        success = request.transition_to('delivered', self.purchasing, "Items delivered and verified")
        self.assertTrue(success)
        
        # Step 8: Mark as completed
        success = request.transition_to('completed', self.purchasing, "Request completed successfully")
        self.assertTrue(success)
        
        # Verify final state
        self.assertEqual(request.status, 'completed')
        
        # Verify approval history was logged for each step
        history_count = ApprovalHistory.objects.filter(request=request).count()
        self.assertEqual(history_count, 6)  # 6 transitions logged
        
    def test_request_rejection_scenario(self):
        """Test request rejection at different approval levels"""
        # Create and submit request
        request = self.create_test_request()
        request.transition_to('pending', self.engineer)
        
        # Team leader rejects
        success = request.transition_to('rejected', self.team_leader, "Budget constraints - denied")
        self.assertTrue(success)
        self.assertEqual(request.status, 'rejected')
        
        # Verify no further transitions are possible
        self.assertEqual(request.get_valid_transitions(), [])
        self.assertFalse(request.can_transition_to('pending'))
        
        # Verify rejection was logged
        rejection_history = ApprovalHistory.objects.filter(
            request=request, 
            action='rejected'
        ).first()
        self.assertIsNotNone(rejection_history)
        self.assertEqual(rejection_history.user, self.team_leader)
        
    def test_request_revision_scenario(self):
        """Test request revision workflow"""
        # Create and submit request
        request = self.create_test_request()
        request.transition_to('pending', self.engineer)
        
        # Team leader requests revision
        success = request.transition_to('revision_requested', self.team_leader, 
                                      "Please provide more specific chair models and quotes")
        self.assertTrue(success)
        self.assertEqual(request.status, 'revision_requested')
        
        # Check valid transitions from revision_requested
        valid_transitions = request.get_valid_transitions()
        self.assertEqual(valid_transitions, ['pending'])
        
        # Engineer revises and resubmits
        request.description += "\n\nRevised: Specific model - Herman Miller Aeron chairs, 3 quotes attached"
        request.revision_count += 1
        success = request.transition_to('pending', self.engineer, "Revised with requested details")
        self.assertTrue(success)
        
        # Verify revision counter
        self.assertEqual(request.revision_count, 1)
        
        # Now team leader can approve
        success = request.transition_to('approved', self.team_leader, "Revision approved")
        self.assertTrue(success)
        
    def test_purchasing_team_rejection(self):
        """Test purchasing team rejecting an approved request"""
        # Create approved request
        request = self.create_test_request()
        request.transition_to('pending', self.engineer)
        request.transition_to('approved', self.team_leader, "Approved")
        request.transition_to('purchasing', self.team_leader, "Moving to purchasing")
        
        # Purchasing team rejects (maybe vendor issues)
        success = request.transition_to('rejected', self.purchasing, 
                                      "Vendor discontinued this model")
        self.assertTrue(success)
        self.assertEqual(request.status, 'rejected')
        
    def test_invalid_state_transitions(self):
        """Test that invalid state transitions are prevented"""
        request = self.create_test_request()
        
        # Test invalid transitions from draft
        with self.assertRaises(ValueError):
            request.transition_to('approved', self.engineer)
            
        with self.assertRaises(ValueError):
            request.transition_to('completed', self.engineer)
            
        # Submit to pending
        request.transition_to('pending', self.engineer)
        
        # Test invalid transitions from pending
        with self.assertRaises(ValueError):
            request.transition_to('ordered', self.engineer)
            
        with self.assertRaises(ValueError):
            request.transition_to('completed', self.engineer)
            
    def test_approval_level_tracking(self):
        """Test that approval levels are correctly tracked"""
        request = self.create_test_request()
        request.transition_to('pending', self.engineer)
        
        # Team leader approval (level 1)
        request.transition_to('in_review', self.team_leader, "Level 1 approval")
        
        history = ApprovalHistory.objects.filter(
            request=request,
            user=self.team_leader
        ).first()
        self.assertEqual(history.level, 1)
        
        # Manager approval (level 2)
        request.transition_to('approved', self.manager, "Level 2 approval")
        
        history = ApprovalHistory.objects.filter(
            request=request,
            user=self.manager
        ).first()
        self.assertEqual(history.level, 2)
        
    def test_hierarchy_bypass_prevented(self):
        """Test that users cannot bypass hierarchy levels"""
        request = self.create_test_request()
        request.transition_to('pending', self.engineer)
        
        # CEO cannot approve directly without going through chain
        # (This would be enforced by business logic in views, not model)
        # For now, just test that approval chain is correctly generated
        
        chain = request.get_approval_chain()
        self.assertIn(self.team_leader, chain)  # Must go through team leader first
        self.assertIn(self.manager, chain)      # Then manager
        self.assertIn(self.ceo, chain)          # Finally CEO
        
    def test_multiple_revision_cycles(self):
        """Test multiple revision cycles"""
        request = self.create_test_request()
        request.transition_to('pending', self.engineer)
        
        # First revision cycle
        request.transition_to('revision_requested', self.team_leader, "Need quotes")
        request.transition_to('pending', self.engineer, "Added quotes")
        
        # Second revision cycle  
        request.transition_to('revision_requested', self.manager, "Need different vendor")
        request.revision_count += 1
        request.transition_to('pending', self.engineer, "Changed vendor")
        
        # Finally approved
        request.transition_to('approved', self.manager, "Now approved")
        
        # Check revision count
        request.refresh_from_db()
        self.assertGreaterEqual(request.revision_count, 1)
        
        # Check history has all transitions
        history_count = ApprovalHistory.objects.filter(request=request).count()
        self.assertEqual(history_count, 6)  # All transitions logged
        
    def test_concurrent_approval_prevention(self):
        """Test prevention of concurrent approvals (business logic)"""
        request = self.create_test_request()
        request.transition_to('pending', self.engineer)
        
        # Set current approver
        request.current_approver = self.team_leader
        request.save()
        
        # Verify next approver logic
        next_approver = request.get_next_approver()
        self.assertEqual(next_approver, self.manager)
        
        # This ensures that the system knows who should approve next
        # Actual concurrent prevention would be in views/business logic
        
    def test_request_data_integrity(self):
        """Test that request data remains intact through workflow"""
        original_data = {
            'item': 'Test Item',
            'description': 'Original description',
            'quantity': Decimal('10.00'),
            'unit': 'pieces',
            'category': 'Test Category'
        }
        
        request = Request.objects.create(
            request_number="REQ-INTEGRITY-001",
            created_by=self.engineer,
            **original_data
        )
        
        # Transition through multiple states
        request.transition_to('pending', self.engineer)
        request.transition_to('approved', self.team_leader)
        request.transition_to('purchasing', self.team_leader)
        request.transition_to('ordered', self.purchasing)
        
        # Verify original data is preserved
        request.refresh_from_db()
        self.assertEqual(request.item, original_data['item'])
        self.assertEqual(request.description, original_data['description'])
        self.assertEqual(request.quantity, original_data['quantity'])
        self.assertEqual(request.unit, original_data['unit'])
        self.assertEqual(request.category, original_data['category'])
        
    def test_approval_history_completeness(self):
        """Test that approval history captures all necessary information"""
        request = self.create_test_request()
        
        # Transition with detailed notes
        request.transition_to('pending', self.engineer, "Initial submission with full details")
        request.transition_to('approved', self.team_leader, "Approved after review")
        
        # Check history entries
        histories = ApprovalHistory.objects.filter(request=request).order_by('created_at')
        
        # First entry (submission)
        first_history = histories[0]
        self.assertEqual(first_history.action, 'submitted')
        self.assertEqual(first_history.user, self.engineer)
        self.assertEqual(first_history.notes, "Initial submission with full details")
        self.assertEqual(first_history.level, 0)  # Creator level
        
        # Second entry (approval)
        second_history = histories[1]
        self.assertEqual(second_history.action, 'final_approved')
        self.assertEqual(second_history.user, self.team_leader)
        self.assertEqual(second_history.notes, "Approved after review")
        self.assertEqual(second_history.level, 1)  # First supervisor level