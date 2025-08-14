from django.test import TestCase
from django.contrib.auth import get_user_model
from organization.models import Worksite, Division

User = get_user_model()


class WorksiteModelTest(TestCase):
    """Test cases for Worksite model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username="testuser",
            first_name="Test",
            last_name="User",
            password="testpass123"
        )
    
    def test_create_worksite(self):
        """Test creating a worksite"""
        worksite = Worksite.objects.create(
            address="123 Main Street, Building A",
            city="Istanbul",
            country="Turkey"
        )
        
        self.assertEqual(worksite.address, "123 Main Street, Building A")
        self.assertEqual(worksite.city, "Istanbul")
        self.assertEqual(worksite.country, "Turkey")
        self.assertIsNone(worksite.chief)
    
    def test_worksite_with_chief(self):
        """Test worksite with a chief assigned"""
        worksite = Worksite.objects.create(
            address="456 Industrial Ave",
            city="Ankara",
            country="Turkey",
            chief=self.user
        )
        
        self.assertEqual(worksite.chief, self.user)
        self.assertIn(worksite, self.user.worksite_chief.all())
    
    def test_worksite_str_method(self):
        """Test worksite string representation"""
        worksite = Worksite.objects.create(
            address="789 Factory Road",
            city="Izmir",
            country="Turkey"
        )
        
        expected = "Izmir, Turkey"
        self.assertEqual(str(worksite), expected)
    
    def test_worksite_default_country(self):
        """Test worksite default country is Turkey"""
        worksite = Worksite.objects.create(
            address="Test Address",
            city="Test City"
            # country should default to Turkey
        )
        
        self.assertEqual(worksite.country, "Turkey")
    
    def test_multiple_worksites_same_city(self):
        """Test multiple worksites in same city"""
        worksite1 = Worksite.objects.create(
            address="Site 1 Address",
            city="Istanbul",
            country="Turkey"
        )
        
        worksite2 = Worksite.objects.create(
            address="Site 2 Address", 
            city="Istanbul",
            country="Turkey"
        )
        
        self.assertEqual(worksite1.city, worksite2.city)
        self.assertNotEqual(worksite1.address, worksite2.address)
        self.assertEqual(str(worksite1), str(worksite2))  # Same city, country


class DivisionModelTest(TestCase):
    """Test cases for Division model"""
    
    def setUp(self):
        """Set up test data"""
        self.creator_user = User.objects.create_user(
            username="creator",
            first_name="Creator",
            last_name="User",
            password="testpass123"
        )
        
        self.worksite1 = Worksite.objects.create(
            address="Worksite 1 Address",
            city="Istanbul",
            country="Turkey"
        )
        
        self.worksite2 = Worksite.objects.create(
            address="Worksite 2 Address",
            city="Ankara", 
            country="Turkey"
        )
    
    def test_create_division(self):
        """Test creating a division"""
        division = Division.objects.create(
            name="Engineering Department",
            created_by=self.creator_user
        )
        
        self.assertEqual(division.name, "Engineering Department")
        self.assertEqual(division.created_by, self.creator_user)
        self.assertEqual(division.worksites.count(), 0)
    
    def test_division_with_worksites(self):
        """Test division with worksites assigned"""
        division = Division.objects.create(
            name="Operations Division",
            created_by=self.creator_user
        )
        
        division.worksites.add(self.worksite1, self.worksite2)
        
        self.assertEqual(division.worksites.count(), 2)
        self.assertIn(self.worksite1, division.worksites.all())
        self.assertIn(self.worksite2, division.worksites.all())
    
    def test_division_str_method(self):
        """Test division string representation"""
        division = Division.objects.create(
            name="Human Resources",
            created_by=self.creator_user
        )
        
        self.assertEqual(str(division), "Human Resources")
    
    def test_division_created_by_relationship(self):
        """Test division creator relationship"""
        division = Division.objects.create(
            name="IT Department",
            created_by=self.creator_user
        )
        
        self.assertEqual(division.created_by, self.creator_user)
        self.assertIn(division, self.creator_user.created_divisions.all())
    
    def test_multiple_divisions_same_creator(self):
        """Test multiple divisions by same creator"""
        division1 = Division.objects.create(
            name="Marketing",
            created_by=self.creator_user
        )
        
        division2 = Division.objects.create(
            name="Sales", 
            created_by=self.creator_user
        )
        
        created_divisions = self.creator_user.created_divisions.all()
        self.assertEqual(created_divisions.count(), 2)
        self.assertIn(division1, created_divisions)
        self.assertIn(division2, created_divisions)
    
    def test_division_worksite_many_to_many(self):
        """Test division-worksite many-to-many relationship"""
        division1 = Division.objects.create(
            name="Production",
            created_by=self.creator_user
        )
        
        division2 = Division.objects.create(
            name="Quality Control",
            created_by=self.creator_user
        )
        
        # One worksite can belong to multiple divisions
        division1.worksites.add(self.worksite1)
        division2.worksites.add(self.worksite1)
        
        # Verify worksite is in both divisions
        self.assertIn(self.worksite1, division1.worksites.all())
        self.assertIn(self.worksite1, division2.worksites.all())
    
    def test_remove_worksite_from_division(self):
        """Test removing worksite from division"""
        division = Division.objects.create(
            name="Research & Development",
            created_by=self.creator_user
        )
        
        division.worksites.add(self.worksite1, self.worksite2)
        self.assertEqual(division.worksites.count(), 2)
        
        division.worksites.remove(self.worksite1)
        self.assertEqual(division.worksites.count(), 1)
        self.assertNotIn(self.worksite1, division.worksites.all())
        self.assertIn(self.worksite2, division.worksites.all())