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
        """Override save to auto-generate username if not provided and validate supervisor assignment"""
        if not self.username and self.first_name and self.last_name:
            # Generate username using the manager method
            self.username = self.__class__.objects.generate_username(self.first_name, self.last_name)

        # Prevent circular supervision chains
        if self.supervisor:
            self._validate_supervisor_assignment()

        super().save(*args, **kwargs)

    def _validate_supervisor_assignment(self):
        """Validate that supervisor assignment doesn't create circular reference"""
        if not self.supervisor:
            return

        # Can't supervise yourself
        if self.supervisor.id == self.id:
            raise ValueError("A user cannot supervise themselves")

        # Check for circular reference in the chain
        visited = set()
        current = self.supervisor

        while current and current.id not in visited:
            visited.add(current.id)

            # If we reach ourselves through the chain, it's circular
            if current.supervisor and current.supervisor.id == self.id:
                raise ValueError(f"Circular supervision detected: {self.get_full_name()} cannot supervise {self.supervisor.get_full_name()} as it creates a circular reference")

            current = current.supervisor

        # If we hit a node we've already visited, there's a circular reference
        if current and current.id in visited:
            raise ValueError("Circular supervision chain detected in existing hierarchy")
    
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
        visited = {self.id}
        current = self.supervisor

        while current and current.id not in visited:
            chain.append(current)
            visited.add(current.id)
            current = current.supervisor

        return chain

    def remove_supervisor(self):
        """Remove supervisor from this user (promotes to top level)"""
        return self.change_supervisor(None)

    def change_supervisor(self, new_supervisor):
        """
        Change supervisor for this user with audit logging.

        Args:
            new_supervisor: User object or None to remove supervisor

        Returns:
            bool: True if change was made, False if no change needed

        Raises:
            ValueError: If the assignment would create circular supervision
        """
        if self.supervisor == new_supervisor:
            return False  # No change needed

        old_supervisor = self.supervisor
        old_supervisor_info = {
            'supervisor_id': old_supervisor.id if old_supervisor else None,
            'supervisor_name': old_supervisor.get_full_name() if old_supervisor else None
        }

        # Set new supervisor (this will trigger validation in save())
        self.supervisor = new_supervisor
        self.save()  # This may raise ValueError for circular references

        # Log the organizational change in audit if AuditLog is available
        try:
            from requisition.models import AuditLog

            if new_supervisor is None:
                action = 'supervisor_removed'
                description = f'Supervisor {old_supervisor_info["supervisor_name"]} removed from {self.get_full_name()}'
            elif old_supervisor is None:
                action = 'supervisor_assigned'
                description = f'Supervisor {new_supervisor.get_full_name()} assigned to {self.get_full_name()}'
            else:
                action = 'supervisor_changed'
                description = f'Supervisor changed from {old_supervisor_info["supervisor_name"]} to {new_supervisor.get_full_name()} for {self.get_full_name()}'

            AuditLog.objects.create(
                user=self,  # The user whose supervision is changing
                action=action,
                table_name='authentication_user',
                record_id=self.id,
                old_values=old_supervisor_info,
                new_values={
                    'supervisor_id': new_supervisor.id if new_supervisor else None,
                    'supervisor_name': new_supervisor.get_full_name() if new_supervisor else None
                }
            )
        except ImportError:
            pass  # AuditLog not available

        return True
    
    def get_user_permissions(self):
        """Get all permissions for this user (from groups + individual permissions)"""
        if self.is_superuser:
            # Superuser has all permissions
            from django.contrib.auth.models import Permission
            return Permission.objects.all()
        
        # Get permissions from groups + individual permissions
        return self.get_all_permissions()

    def can_purchase(self) -> bool:
        """Return True if user has purchasing permissions."""
        return self.is_superuser or self.has_perm('requisition.can_purchase')

    def has_subordinates(self) -> bool:
        """Return True if user has direct reports."""
        return self.direct_reports.filter(deleted_at__isnull=True).exists()

    def can_view_all_requests(self) -> bool:
        """Return True if user can view all requests system-wide (admins)."""
        return self.is_superuser or self.has_perm('requisition.view_all_requests')

    def get_role_info(self) -> dict:
        """Get comprehensive role information for the user."""
        return {
            'has_subordinates': self.has_subordinates(),
            'can_purchase': self.can_purchase(),
            'can_view_all_requests': self.can_view_all_requests(),
            'is_admin': self.is_superuser,
            'subordinate_count': self.direct_reports.filter(deleted_at__isnull=True).count(),
        }
    
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
