from django.contrib.auth.models import BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


class UserManager(BaseUserManager):
    """
    Custom user model manager for User model.
    """

    def generate_username(self, first_name, last_name):
        """
        Generate username from first 3 letters of first name and last name.
        If conflict exists, append numbers.
        """
        if not first_name or not last_name:
            raise ValueError(_("First name and last name are required to generate username"))
        
        # Take first 3 letters of each name, convert to lowercase
        base_username = (first_name[:3] + last_name[:3]).lower()
        username = base_username
        counter = 1
        
        # Check for conflicts and append numbers if needed
        while self.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        
        return username

    def create_user(self, username=None, password=None, **extra_fields):
        """
        Create and save a User with the given username and password.
        If username is not provided, generate it from first_name and last_name.
        """
        first_name = extra_fields.get('first_name', '')
        last_name = extra_fields.get('last_name', '')
        
        if not username:
            if not first_name or not last_name:
                raise ValueError(_("Either username must be provided, or both first_name and last_name"))
            username = self.generate_username(first_name, last_name)
        
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username=None, password=None, **extra_fields):
        """
        Create and save a SuperUser with the given username and password.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))

        return self.create_user(username, password, **extra_fields)
    
    def active_users(self):
        """
        Return active users (not soft deleted).
        """
        return self.filter(deleted_at__isnull=True, is_active=True)
    
    def by_worksite(self, worksite):
        """
        Filter users by worksite.
        """
        return self.filter(worksite=worksite, deleted_at__isnull=True)
    
    def by_group(self, group_name):
        """
        Filter users by group name.
        """
        return self.filter(groups__name=group_name, deleted_at__isnull=True)
    
    def purchasing_team(self):
        """
        Get all users in purchasing team.
        """
        return self.by_group('Purchasing')
