from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from organization.models import Worksite, Division

User = get_user_model()


class UserModelTest(TestCase):
    """Test cases for User model"""
    
    def setUp(self):
        """Set up test data"""
        # Create a test admin user first for Division.created_by
        self.admin_user = User.objects.create_superuser(
            username="testadmin",
            first_name="Test",
            last_name="Admin",
            password="adminpass123"
        )
        
        self.worksite = Worksite.objects.create(
            address="123 Test St",
            city="Test City",
            country="Turkey"
        )
        
        self.division = Division.objects.create(
            name="Test Division",
            created_by=self.admin_user
        )
    
    def test_create_user_with_username(self):
        """Test creating user with provided username"""
        user = User.objects.create_user(
            username="testuser",
            first_name="Test",
            last_name="User",
            password="testpass123"
        )
        
        self.assertEqual(user.username, "testuser")
        self.assertEqual(user.first_name, "Test")
        self.assertEqual(user.last_name, "User")
        self.assertTrue(user.check_password("testpass123"))
    
    def test_create_user_without_username_auto_generates(self):
        """Test creating user without username auto-generates from names"""
        user = User.objects.create_user(
            first_name="Ahmed",
            last_name="Hassan",
            password="testpass123"
        )
        
        self.assertEqual(user.username, "ahmhas")
        self.assertEqual(user.first_name, "Ahmed")
        self.assertEqual(user.last_name, "Hassan")
    
    def test_create_user_username_conflict_adds_number(self):
        """Test username conflict resolution by adding numbers"""
        # Create first user
        user1 = User.objects.create_user(
            first_name="Ahmed",
            last_name="Hassan",
            password="testpass123"
        )
        
        # Create second user with same name pattern
        user2 = User.objects.create_user(
            first_name="Ahmad",
            last_name="Hasan", 
            password="testpass123"
        )
        
        self.assertEqual(user1.username, "ahmhas")
        self.assertEqual(user2.username, "ahmhas1")
    
    def test_create_user_requires_first_last_name_if_no_username(self):
        """Test that first_name and last_name are required if username not provided"""
        with self.assertRaises(ValueError):
            User.objects.create_user(
                first_name="Test",
                # Missing last_name
                password="testpass123"
            )
        
        with self.assertRaises(ValueError):
            User.objects.create_user(
                last_name="User",
                # Missing first_name
                password="testpass123"
            )
    
    def test_user_full_name(self):
        """Test get_full_name method"""
        user = User.objects.create_user(
            username="testuser",
            first_name="Test",
            last_name="User",
            password="testpass123"
        )
        
        self.assertEqual(user.get_full_name(), "Test User")
    
    def test_user_with_worksite_and_division(self):
        """Test user with worksite and division relationships"""
        user = User.objects.create_user(
            username="testuser",
            first_name="Test",
            last_name="User",
            worksite=self.worksite,
            division=self.division,
            password="testpass123"
        )
        
        self.assertEqual(user.worksite, self.worksite)
        self.assertEqual(user.division, self.division)
    
    def test_user_supervisor_relationship(self):
        """Test supervisor relationship"""
        supervisor = User.objects.create_user(
            username="supervisor",
            first_name="Super",
            last_name="Visor",
            password="testpass123"
        )
        
        employee = User.objects.create_user(
            username="employee",
            first_name="Emp",
            last_name="Loyee",
            supervisor=supervisor,
            password="testpass123"
        )
        
        self.assertEqual(employee.supervisor, supervisor)
        self.assertIn(employee, supervisor.direct_reports.all())
    
    def test_user_hierarchy_chain(self):
        """Test get_hierarchy_chain method"""
        ceo = User.objects.create_user(
            username="ceo",
            first_name="Chief",
            last_name="Executive",
            password="testpass123"
        )
        
        manager = User.objects.create_user(
            username="manager",
            first_name="Man",
            last_name="Ager",
            supervisor=ceo,
            password="testpass123"
        )
        
        employee = User.objects.create_user(
            username="employee",
            first_name="Emp",
            last_name="Loyee",
            supervisor=manager,
            password="testpass123"
        )
        
        chain = employee.get_hierarchy_chain()
        self.assertEqual(len(chain), 3)
        self.assertEqual(chain[0], employee)
        self.assertEqual(chain[1], manager)
        self.assertEqual(chain[2], ceo)
    
    def test_user_phone_number(self):
        """Test phone_number field"""
        user = User.objects.create_user(
            username="testuser",
            first_name="Test",
            last_name="User",
            phone_number="+90 555 123 4567",
            password="testpass123"
        )
        
        self.assertEqual(user.phone_number, "+90 555 123 4567")
    
    def test_create_superuser(self):
        """Test creating superuser"""
        admin = User.objects.create_superuser(
            username="admin",
            first_name="Admin",
            last_name="User",
            password="adminpass123"
        )
        
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
    
    def test_create_superuser_without_username(self):
        """Test creating superuser without username"""
        admin = User.objects.create_superuser(
            first_name="Admin",
            last_name="User",
            password="adminpass123"
        )
        
        self.assertEqual(admin.username, "admuse")
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)