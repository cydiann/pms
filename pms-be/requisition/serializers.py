from rest_framework import serializers
from .models import Request, ApprovalHistory, AuditLog, ProcurementDocument


class RequestSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    latest_approval_name = serializers.CharField(source='latest_approval.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    unit_display = serializers.CharField(source='get_unit_display', read_only=True)
    
    class Meta:
        model = Request
        fields = '__all__'
        read_only_fields = ['request_number', 'created_by', 'created_at', 'updated_at']


class RequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Request
        fields = [
            'item', 'description', 'quantity', 'unit', 
            'category', 'delivery_address', 'reason'
        ]


class RequestUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Request
        fields = [
            'item', 'description', 'quantity', 'unit', 
            'category', 'delivery_address', 'reason', 'status'
        ]


class ApprovalHistorySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    request_number = serializers.CharField(source='request.request_number', read_only=True)
    
    class Meta:
        model = ApprovalHistory
        fields = '__all__'


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = '__all__'


class ProcurementDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    download_url = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    
    class Meta:
        model = ProcurementDocument
        fields = [
            'id', 'request', 'document_type', 'file_name', 'file_size',
            'file_type', 'status', 'uploaded_at', 'created_at', 'updated_at',
            'description', 'metadata', 'uploaded_by', 'uploaded_by_name',
            'download_url', 'can_delete'
        ]
        read_only_fields = [
            'id', 'uploaded_at', 'created_at', 'updated_at', 'status',
            'uploaded_by', 'object_name'
        ]
    
    def get_download_url(self, obj):
        if obj.status == 'uploaded':
            from requisition.storage import storage
            return storage.get_presigned_download_url(obj.object_name)
        return None
    
    def get_can_delete(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        
        user = request.user
        return (
            user.is_superuser or
            obj.uploaded_by == user or
            (user.role and user.role.can_purchase)
        )


class CreateDocumentSerializer(serializers.ModelSerializer):
    upload_url = serializers.CharField(read_only=True)
    
    class Meta:
        model = ProcurementDocument
        fields = [
            'id', 'request', 'document_type', 'file_name', 'file_size',
            'file_type', 'description', 'metadata', 'upload_url'
        ]
    
    def validate_file_size(self, value):
        from django.conf import settings
        max_size = settings.MAX_UPLOAD_SIZE
        if value > max_size:
            raise serializers.ValidationError(
                f"File size exceeds maximum allowed size of {max_size} bytes"
            )
        return value
    
    def validate_file_type(self, value):
        # Allowed MIME types for procurement documents
        allowed_types = [
            # Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
            
            # Spreadsheets
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
            'text/csv',
            
            # Images (for receipts, photos of delivered goods)
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            
            # Text files
            'text/plain',
            
            # Compressed files (for multiple documents)
            'application/zip',
            'application/x-zip-compressed',
            'application/x-rar-compressed',
        ]
        
        if value not in allowed_types:
            raise serializers.ValidationError(
                f"File type '{value}' is not allowed. Allowed types: PDF, Word, Excel, CSV, Images (JPG, PNG), ZIP"
            )
        return value
    
    def validate(self, data):
        request_obj = data.get('request')
        document_type = data.get('document_type')
        user = self.context['request'].user
        
        # Check permissions based on request status and document type
        if document_type == 'dispatch_note' and request_obj.status != 'ordered':
            raise serializers.ValidationError("Dispatch notes can only be uploaded for ordered requests")
        
        if document_type == 'receipt' and request_obj.status != 'delivered':
            raise serializers.ValidationError("Receipts can only be uploaded for delivered requests")
        
        if document_type in ['quote', 'purchase_order'] and request_obj.status not in ['approved', 'purchasing']:
            raise serializers.ValidationError("Quotes and POs can only be uploaded during purchasing phase")
        
        # Check user permissions
        if not user.is_superuser and not (user.role and user.role.can_purchase):
            raise serializers.ValidationError("You don't have permission to upload documents")
        
        return data
    
    def create(self, validated_data):
        from requisition.storage import storage
        
        # Generate object name
        request_obj = validated_data['request']
        document_type = validated_data['document_type']
        file_name = validated_data['file_name']
        
        object_name = storage.generate_object_name(
            request_obj.request_number,
            document_type,
            file_name
        )
        
        # Create document record
        document = ProcurementDocument.objects.create(
            **validated_data,
            object_name=object_name,
            uploaded_by=self.context['request'].user,
            status='pending'
        )
        
        # Generate presigned upload URL
        upload_url = storage.get_presigned_upload_url(object_name)
        document.upload_url = upload_url
        
        return document


class ConfirmUploadSerializer(serializers.Serializer):
    document_id = serializers.UUIDField()
    
    def validate_document_id(self, value):
        try:
            document = ProcurementDocument.objects.get(id=value)
            if document.status != 'pending':
                raise serializers.ValidationError("Document is not in pending status")
            self.document = document
            return value
        except ProcurementDocument.DoesNotExist:
            raise serializers.ValidationError("Document not found")
    
    def save(self):
        from requisition.storage import storage
        
        # Verify file exists in MinIO
        if storage.object_exists(self.document.object_name):
            self.document.mark_uploaded()
            return True
        else:
            self.document.mark_failed()
            return False