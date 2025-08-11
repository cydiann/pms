from rest_framework import serializers
from .models import Request, ApprovalHistory, AuditLog


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