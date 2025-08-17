from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth.models import Group, Permission
from organization.models import Worksite, Division

User = get_user_model()


class UserViewSetTest(APITestCase):
    """Test cases for UserViewSet"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create worksite
        self.worksite = Worksite.objects.create(
            address="123 Test St",
            city="Test City",
            country="Turkey"
        )
        
        # Create test admin user first
        self.admin_user = User.objects.create_superuser(
            username="admin",
            first_name="Admin",
            last_name="User",
            password="adminpass123"
        )
        
        # Create division with admin as creator
        self.division = Division.objects.create(
            name="Test Division",
            created_by=self.admin_user
        )
        
        self.regular_user = User.objects.create_user(
            username="regular",
            first_name="Regular",
            last_name="User",
            worksite=self.worksite,
            password="regularpass123"
        )
        
        # Create test group
        self.test_group = Group.objects.create(name="Test Group")
        
        # URLs
        self.users_url = reverse('user-list')
        self.user_detail_url = lambda pk: reverse('user-detail', args=[pk])
    
    def test_list_users_as_admin(self):
        """Test admin can list all users"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.users_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)  # admin + regular user
    
    def test_list_users_as_regular_user(self):
        """Test regular user cannot list all users (should get 403)"""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.users_url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_regular_user_can_access_me_endpoint(self):
        """Test regular user can access their own profile via /me endpoint"""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(f'{self.users_url}me/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.regular_user.id)
        self.assertEqual(response.data['username'], self.regular_user.username)
    
    def test_create_user_as_admin(self):
        """Test admin can create users"""
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'first_name': 'New',
            'last_name': 'User',
            'worksite': self.worksite.id,
            'phone_number': '+90 555 123 4567'
        }
        
        response = self.client.post(self.users_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['username'], 'newuse')  # Auto-generated
        self.assertEqual(response.data['first_name'], 'New')
        self.assertEqual(response.data['phone_number'], '+90 555 123 4567')
    
    def test_create_user_with_username(self):
        """Test creating user with provided username"""
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'username': 'customuser',
            'first_name': 'Custom',
            'last_name': 'User',
            'worksite': self.worksite.id
        }
        
        response = self.client.post(self.users_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['username'], 'customuser')
    
    def test_create_user_missing_names_fails(self):
        """Test creating user without first_name and last_name fails"""
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'first_name': 'Only First'
            # Missing last_name and username
        }
        
        response = self.client.post(self.users_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_regular_user_cannot_create_users(self):
        """Test regular user cannot create users"""
        self.client.force_authenticate(user=self.regular_user)
        
        data = {
            'first_name': 'New',
            'last_name': 'User'
        }
        
        response = self.client.post(self.users_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_update_user_as_admin(self):
        """Test admin can update users"""
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'first_name': 'Updated',
            'phone_number': '+90 555 999 8888'
        }
        
        response = self.client.patch(self.user_detail_url(self.regular_user.id), data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Updated')
        self.assertEqual(response.data['phone_number'], '+90 555 999 8888')
    
    def test_user_can_update_themselves(self):
        """Test user can update their own profile"""
        self.client.force_authenticate(user=self.regular_user)
        
        data = {
            'first_name': 'Self Updated',
            'phone_number': '+90 555 777 6666'
        }
        
        response = self.client.patch(self.user_detail_url(self.regular_user.id), data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Self Updated')
    
    def test_user_cannot_update_others(self):
        """Test user cannot update other users"""
        self.client.force_authenticate(user=self.regular_user)
        
        data = {
            'first_name': 'Hacked'
        }
        
        response = self.client.patch(self.user_detail_url(self.admin_user.id), data)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_me_endpoint(self):
        """Test /me endpoint returns current user"""
        self.client.force_authenticate(user=self.regular_user)
        
        response = self.client.get(reverse('user-me'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.regular_user.id)
        self.assertEqual(response.data['username'], 'regular')
    
    def test_my_permissions_endpoint(self):
        """Test /my-permissions endpoint"""
        self.client.force_authenticate(user=self.regular_user)
        
        response = self.client.get(reverse('user-my-permissions'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('permissions', response.data)
        self.assertIn('groups', response.data)
        self.assertIn('is_superuser', response.data)
    
    def test_manage_groups_as_admin(self):
        """Test admin can manage user groups"""
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'action': 'add',
            'group_ids': [self.test_group.id]
        }
        
        response = self.client.post(
            reverse('user-manage-groups', args=[self.regular_user.id]), 
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.test_group, self.regular_user.groups.all())
    
    def test_filter_users_by_worksite(self):
        """Test filtering users by worksite"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(self.users_url, {'worksite': self.worksite.id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return only regular_user who has worksite assigned
        usernames = [user['username'] for user in response.data['results']]
        self.assertIn('regular', usernames)
        self.assertNotIn('admin', usernames)  # admin has no worksite
    
    def test_search_users(self):
        """Test searching users by name"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(self.users_url, {'search': 'Regular'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['first_name'], 'Regular')
    
    def test_order_users(self):
        """Test ordering users"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get(self.users_url, {'ordering': 'username'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [user['username'] for user in response.data['results']]
        self.assertEqual(usernames, sorted(usernames))
    
    def test_unauthenticated_access_forbidden(self):
        """Test unauthenticated users cannot access user endpoints"""
        response = self.client.get(self.users_url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)