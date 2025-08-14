from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from organization.models import Worksite, Division

User = get_user_model()


class WorksiteViewSetTest(APITestCase):
    """Test cases for WorksiteViewSet"""
    
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
        
        self.chief_user = User.objects.create_user(
            username="chief",
            first_name="Chief",
            last_name="User", 
            password="chiefpass123"
        )
        
        # Create test worksites
        self.worksite1 = Worksite.objects.create(
            address="123 Main St",
            city="Istanbul",
            country="Turkey",
            chief=self.chief_user
        )
        
        self.worksite2 = Worksite.objects.create(
            address="456 Industrial Ave",
            city="Ankara",
            country="Turkey"
        )
        
        # Assign regular user to worksite1
        self.regular_user.worksite = self.worksite1
        self.regular_user.save()
        
        # URLs
        self.worksites_url = reverse('worksite-list')
        self.worksite_detail_url = lambda pk: reverse('worksite-detail', args=[pk])
    
    def test_list_worksites_authenticated(self):
        """Test authenticated user can list worksites"""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.worksites_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_retrieve_worksite_authenticated(self):
        """Test authenticated user can retrieve worksite details"""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.worksite_detail_url(self.worksite1.id))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['city'], 'Istanbul')
        self.assertEqual(response.data['country'], 'Turkey')
    
    def test_create_worksite_as_admin(self):
        """Test admin can create worksites"""
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'address': '789 New Street',
            'city': 'Izmir',
            'country': 'Turkey',
            'chief': self.chief_user.id
        }
        
        response = self.client.post(self.worksites_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['city'], 'Izmir')
        self.assertEqual(response.data['chief'], self.chief_user.id)
    
    def test_create_worksite_as_regular_user_forbidden(self):
        """Test regular user cannot create worksites"""
        self.client.force_authenticate(user=self.regular_user)
        
        data = {
            'address': '789 Forbidden Street',
            'city': 'Denied City',
            'country': 'Turkey'
        }
        
        response = self.client.post(self.worksites_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_update_worksite_as_admin(self):
        """Test admin can update worksites"""
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'address': 'Updated Address',
            'city': 'Updated City'
        }
        
        response = self.client.patch(self.worksite_detail_url(self.worksite1.id), data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['address'], 'Updated Address')
        self.assertEqual(response.data['city'], 'Updated City')
    
    def test_delete_worksite_as_admin(self):
        """Test admin can delete worksites"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.delete(self.worksite_detail_url(self.worksite2.id))
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Worksite.objects.filter(id=self.worksite2.id).exists())
    
    def test_worksite_users_endpoint(self):
        """Test worksite users endpoint"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(
            reverse('worksite-users', args=[self.worksite1.id])
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user_count'], 1)
        self.assertEqual(len(response.data['users']), 1)
        self.assertEqual(response.data['users'][0]['username'], 'regular')
    
    def test_worksite_stats_endpoint(self):
        """Test worksite stats endpoint"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(
            reverse('worksite-stats', args=[self.worksite1.id])
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_users', response.data)
        self.assertIn('active_users', response.data)
        self.assertIn('total_requests', response.data)
        self.assertEqual(response.data['total_users'], 1)
    
    def test_filter_worksites_by_city(self):
        """Test filtering worksites by city"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(self.worksites_url, {'city': 'Istanbul'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['city'], 'Istanbul')
    
    def test_search_worksites(self):
        """Test searching worksites"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(self.worksites_url, {'search': 'Istanbul'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['city'], 'Istanbul')
    
    def test_unauthenticated_access_forbidden(self):
        """Test unauthenticated access is forbidden"""
        response = self.client.get(self.worksites_url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DivisionViewSetTest(APITestCase):
    """Test cases for DivisionViewSet"""
    
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
        
        # Create test worksite
        self.worksite = Worksite.objects.create(
            address="123 Test St",
            city="Test City",
            country="Turkey"
        )
        
        # Create test divisions
        self.division1 = Division.objects.create(
            name="Engineering",
            created_by=self.admin_user
        )
        self.division1.worksites.add(self.worksite)
        
        self.division2 = Division.objects.create(
            name="Operations", 
            created_by=self.admin_user
        )
        
        # Assign regular user to division1
        self.regular_user.division = self.division1
        self.regular_user.save()
        
        # URLs
        self.divisions_url = reverse('division-list')
        self.division_detail_url = lambda pk: reverse('division-detail', args=[pk])
    
    def test_list_divisions_authenticated(self):
        """Test authenticated user can list divisions"""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.divisions_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_retrieve_division_authenticated(self):
        """Test authenticated user can retrieve division details"""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.division_detail_url(self.division1.id))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Engineering')
    
    def test_create_division_as_admin(self):
        """Test admin can create divisions"""
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'name': 'Marketing',
            'created_by': self.admin_user.id,
            'worksites': [self.worksite.id]
        }
        
        response = self.client.post(self.divisions_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Marketing')
    
    def test_create_division_as_regular_user_forbidden(self):
        """Test regular user cannot create divisions"""
        self.client.force_authenticate(user=self.regular_user)
        
        data = {
            'name': 'Forbidden Division',
            'created_by': self.regular_user.id
        }
        
        response = self.client.post(self.divisions_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_update_division_as_admin(self):
        """Test admin can update divisions"""
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'name': 'Updated Engineering'
        }
        
        response = self.client.patch(self.division_detail_url(self.division1.id), data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Engineering')
    
    def test_delete_division_as_admin(self):
        """Test admin can delete divisions"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.delete(self.division_detail_url(self.division2.id))
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Division.objects.filter(id=self.division2.id).exists())
    
    def test_division_users_endpoint(self):
        """Test division users endpoint"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(
            reverse('division-users', args=[self.division1.id])
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user_count'], 1)
        self.assertEqual(len(response.data['users']), 1)
        self.assertEqual(response.data['users'][0]['username'], 'regular')
    
    def test_division_stats_endpoint(self):
        """Test division stats endpoint"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(
            reverse('division-stats', args=[self.division1.id])
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_users', response.data)
        self.assertIn('active_users', response.data)
        self.assertIn('total_requests', response.data)
        self.assertEqual(response.data['total_users'], 1)
    
    def test_filter_divisions_by_name(self):
        """Test filtering divisions by name"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(self.divisions_url, {'name': 'Engineering'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Engineering')
    
    def test_search_divisions(self):
        """Test searching divisions"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(self.divisions_url, {'search': 'Operations'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Operations')
    
    def test_unauthenticated_access_forbidden(self):
        """Test unauthenticated access is forbidden"""
        response = self.client.get(self.divisions_url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)