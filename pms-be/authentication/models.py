from django.db import models
from django.contrib.auth.models import AbstractUser, Group
from .managers import UserManager


class User(AbstractUser):
    username = models.CharField(max_length=150, unique=True, blank=True)  # Make username optional in forms
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    phone_number = models.CharField(max_length=20, blank=True, help_text="Phone number with country code")
    supervisor = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='direct_reports')
    worksite = models.ForeignKey('organization.Worksite', on_delete=models.SET_NULL, null=True)
    division = models.ForeignKey('organization.Division', on_delete=models.SET_NULL, null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    objects = UserManager()
    
    def save(self, *args, **kwargs):
        """Override save to auto-generate username if not provided"""
        if not self.username and self.first_name and self.last_name:
            # Generate username using the manager method
            self.username = self.__class__.objects.generate_username(self.first_name, self.last_name)
        super().save(*args, **kwargs)
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def get_all_subordinates(self):
        """Get all employees in the hierarchy below this user"""
        subordinates = []
        for direct_report in self.direct_reports.filter(deleted_at__isnull=True):
            subordinates.append(direct_report)
            subordinates.extend(direct_report.get_all_subordinates())
        return subordinates
    
    def get_hierarchy_chain(self):
        """Get the full supervisor chain from this user up to CEO"""
        chain = [self]
        current = self.supervisor
        while current:
            chain.append(current)
            current = current.supervisor
        return chain
    
    def get_user_permissions(self):
        """Get all permissions for this user (from groups + individual permissions)"""
        if self.is_superuser:
            # Superuser has all permissions
            from django.contrib.auth.models import Permission
            return Permission.objects.all()
        
        # Get permissions from groups + individual permissions
        return self.get_all_permissions()
    
    def __str__(self):
        return self.get_full_name()


class PasswordResetRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Supervisor Approval'),
        ('approved', 'Approved - Use Temporary Password'),
        ('rejected', 'Rejected'),
        ('used', 'Temporary Password Used'),
        ('expired', 'Expired'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_requests')
    supervisor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='supervised_password_resets')
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    temporary_password = models.CharField(max_length=50, null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_password_resets')
    
    def __str__(self):
        return f"Password reset for {self.user} - {self.status}"
