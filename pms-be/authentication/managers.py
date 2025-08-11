from django.contrib.auth.models import BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


class UserManager(BaseUserManager):
    """
    Custom user model manager for User model.
    """

    def create_user(self, username, password=None, **extra_fields):
        """
        Create and save a User with the given username and password.
        """
        if not username:
            raise ValueError(_("The Username field must be set"))
        
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
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
        return self.by_group('Purchasing Team')