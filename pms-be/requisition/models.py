from django.db import models
import uuid
from datetime import datetime
from django.utils import timezone
from django.contrib.auth import get_user_model


class Request(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Approval'),
        ('in_review', 'Under Review'),
        ('revision_requested', 'Revision Requested'),
        ('approved', 'Final Approved - Ready for Purchase'),
        ('rejected', 'Rejected'),
        ('purchasing', 'Assigned to Purchasing Team'),
        ('ordered', 'Order Placed'),
        ('delivered', 'Delivered'),
        ('completed', 'Request Completed'),
    ]
    
    UNIT_CHOICES = [
        ('pieces', 'Pieces'),
        ('kg', 'Kilograms'),
        ('ton', 'Tons'),
        ('meter', 'Meters'),
        ('m2', 'Square Meters'),
        ('m3', 'Cubic Meters'),
        ('liter', 'Liters'),
    ]

    request_number = models.CharField(max_length=50, unique=True)
    item = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey('authentication.User', on_delete=models.CASCADE, related_name='created_requests')
    current_approver = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='pending_approvals')
    final_approver = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='final_approved_requests')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES)
    category = models.CharField(max_length=100, blank=True)
    delivery_address = models.TextField(blank=True)
    reason = models.TextField(blank=True)
    
    # Revision tracking
    revision_count = models.IntegerField(default=0)
    revision_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    
    def get_approval_chain(self):
        """Get the full approval chain from creator's supervisor up"""
        chain = []
        current = self.created_by.supervisor
        while current:
            chain.append(current)
            current = current.supervisor
        return chain
    
    def get_next_approver(self):
        """Get the next person in the approval chain"""
        if self.status == 'draft':
            return self.created_by.supervisor
        
        chain = self.get_approval_chain()
        if not self.current_approver:
            return chain[0] if chain else None
            
        try:
            current_index = chain.index(self.current_approver)
            return chain[current_index + 1] if current_index + 1 < len(chain) else None
        except ValueError:
            return None
    
    def get_valid_transitions(self):
        """Get valid status transitions from current state"""
        transitions = {
            'draft': ['pending'],
            'pending': ['in_review', 'approved', 'rejected', 'revision_requested'],
            'in_review': ['in_review', 'approved', 'rejected', 'revision_requested'],
            'revision_requested': ['pending'],  # After revision, goes back to pending
            'approved': ['purchasing', 'rejected'],  # Purchasing team can still reject
            'purchasing': ['ordered', 'rejected', 'revision_requested'],  # Purchasing actions
            'ordered': ['delivered'],
            'delivered': ['completed'],
            'rejected': [],  # Final state
            'completed': [],  # Final state
        }
        return transitions.get(self.status, [])
    
    def can_transition_to(self, new_status):
        """Check if transition to new status is valid"""
        return new_status in self.get_valid_transitions()
    
    def transition_to(self, new_status, user, notes=""):
        """Safely transition to new status with validation"""
        if not self.can_transition_to(new_status):
            raise ValueError(f"Invalid transition from '{self.status}' to '{new_status}'")
        
        old_status = self.status
        self.status = new_status
        
        # Set current_approver when transitioning to pending status
        if new_status == 'pending':
            if old_status == 'draft':
                # First submission - set to immediate supervisor
                self.current_approver = self.created_by.supervisor
            elif old_status == 'revision_requested':
                # Resubmission after revision - keep current flow
                chain = self.get_approval_chain()
                if self.current_approver and self.current_approver in chain:
                    # Stay with current approver if they requested revision
                    pass
                else:
                    # Reset to beginning of chain
                    self.current_approver = chain[0] if chain else None
        
        self.save()
        
        # Log the transition
        action_map = {
            'pending': 'submitted',
            'in_review': 'approved',
            'approved': 'final_approved',
            'rejected': 'rejected',
            'revision_requested': 'revision_requested',
            'purchasing': 'assigned_purchasing',
            'ordered': 'ordered',
            'delivered': 'delivered',
            'completed': 'completed',
        }
        
        ApprovalHistory.objects.create(
            request=self,
            user=user,
            action=action_map.get(new_status, new_status),
            level=self.get_approval_level(user),
            notes=notes
        )
        
        return True
    
    def get_approval_level(self, user):
        """Get the approval level of the user in the hierarchy"""
        chain = self.get_approval_chain()
        try:
            return chain.index(user) + 1
        except ValueError:
            # If not in chain, could be purchasing team or admin
            return 0
    
    def save(self, *args, **kwargs):
        """Auto-generate request number if not provided"""
        if not self.request_number:
            # Generate format: REQ-YYYY-XXXXXX (year + 6 random chars)
            year = timezone.now().year
            random_part = str(uuid.uuid4()).replace('-', '').upper()[:6]
            self.request_number = f"REQ-{year}-{random_part}"
            
            # Ensure uniqueness by checking existing request numbers
            while Request.objects.filter(request_number=self.request_number).exists():
                random_part = str(uuid.uuid4()).replace('-', '').upper()[:6]
                self.request_number = f"REQ-{year}-{random_part}"
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.request_number} - {self.item}"


class ApprovalHistory(models.Model):
    ACTION_CHOICES = [
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('revision_requested', 'Revision Requested'),
        ('revised', 'Revised and Resubmitted'),
        ('final_approved', 'Final Approval'),
        ('assigned_purchasing', 'Assigned to Purchasing'),
        ('ordered', 'Order Placed'),
        ('delivered', 'Delivered'),
        ('completed', 'Request Completed'),
    ]
    
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name='approval_history')
    user = models.ForeignKey('authentication.User', on_delete=models.CASCADE)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    level = models.IntegerField(help_text="Level in approval hierarchy (1 = immediate supervisor)")
    notes = models.TextField(blank=True)
    review_notes = models.TextField(blank=True, help_text="Notes from upper management for revision")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.request.request_number} - {self.action} by {self.user} (Level {self.level})"


class RequestRevision(models.Model):
    """Track request revisions when sent back for changes"""
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name='revisions')
    revision_number = models.IntegerField()
    requested_by = models.ForeignKey('authentication.User', on_delete=models.CASCADE, related_name='requested_revisions')
    reason = models.TextField()
    upper_management_notes = models.TextField(blank=True)
    revised_by = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='made_revisions')
    created_at = models.DateTimeField(auto_now_add=True)
    revised_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-revision_number']
    
    def __str__(self):
        return f"{self.request.request_number} - Revision #{self.revision_number}"


class ProcurementDocument(models.Model):
    """Track documents uploaded during procurement lifecycle (quotes, dispatch notes, receipts)"""
    
    DOCUMENT_TYPE_CHOICES = [
        ('quote', 'Quotation'),
        ('purchase_order', 'Purchase Order'),
        ('dispatch_note', 'Dispatch Note'),
        ('receipt', 'Delivery Receipt'),
        ('invoice', 'Invoice'),
        ('other', 'Other Supporting Document'),
    ]
    
    UPLOAD_STATUS_CHOICES = [
        ('pending', 'Pending Upload'),
        ('uploaded', 'Uploaded'),
        ('failed', 'Upload Failed'),
        ('deleted', 'Deleted'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        Request,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    uploaded_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_documents'
    )
    
    document_type = models.CharField(
        max_length=20,
        choices=DOCUMENT_TYPE_CHOICES,
        help_text="Type of procurement document"
    )
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField(help_text="File size in bytes")
    file_type = models.CharField(max_length=100, help_text="MIME type")
    object_name = models.CharField(
        max_length=500,
        unique=True,
        help_text="MinIO object name/path"
    )
    
    status = models.CharField(
        max_length=20,
        choices=UPLOAD_STATUS_CHOICES,
        default='pending'
    )
    
    uploaded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    description = models.TextField(blank=True, help_text="Document description or notes")
    
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional metadata (vendor info, PO number, etc.)"
    )
    
    class Meta:
        db_table = 'procurement_documents'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['request', 'document_type']),
            models.Index(fields=['object_name']),
        ]
        
    def __str__(self):
        return f"{self.get_document_type_display()} - {self.request.request_number}"
    
    def mark_uploaded(self):
        """Mark document as successfully uploaded"""
        self.status = 'uploaded'
        self.uploaded_at = timezone.now()
        self.save(update_fields=['status', 'uploaded_at', 'updated_at'])
    
    def mark_failed(self):
        """Mark document upload as failed"""
        self.status = 'failed'
        self.save(update_fields=['status', 'updated_at'])
    
    def mark_deleted(self):
        """Mark document as deleted (soft delete)"""
        self.status = 'deleted'
        self.save(update_fields=['status', 'updated_at'])
    
    def can_upload_document(self, user):
        """Check if user has permission to upload this document type"""
        from authentication.models import User
        request_status = self.request.status
        
        # Admin can always upload
        if user.is_superuser:
            return True
        
        # Dispatch notes can be uploaded after ordering
        if self.document_type == 'dispatch_note':
            return request_status == 'ordered' and (
                user.role and user.role.can_purchase
            )
        
        # Receipts can be uploaded after delivery
        if self.document_type == 'receipt':
            return request_status == 'delivered' and (
                user.role and user.role.can_purchase
            )
        
        # Quotes can be uploaded during purchasing phase
        if self.document_type == 'quote':
            return request_status in ['approved', 'purchasing'] and (
                user.role and user.role.can_purchase
            )
        
        # Other documents based on general permissions
        return user.role and user.role.can_purchase


class AuditLog(models.Model):
    user = models.ForeignKey('authentication.User', on_delete=models.CASCADE)
    table_name = models.CharField(max_length=50)
    record_id = models.IntegerField()
    action = models.CharField(max_length=20)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user} - {self.action} {self.table_name}:{self.record_id}"
