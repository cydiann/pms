from rest_framework import serializers
from django.contrib.auth.models import Group
from .models import User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    supervisor_name = serializers.CharField(source='supervisor.get_full_name', read_only=True)
    worksite_name = serializers.CharField(source='worksite.__str__', read_only=True)
    division_name = serializers.CharField(source='division.name', read_only=True)
    groups = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    user_permissions = serializers.SerializerMethodField()
    username = serializers.CharField(required=False, allow_blank=True)

    # New computed fields for UI
    is_supervisor = serializers.SerializerMethodField()
    subordinate_count = serializers.SerializerMethodField()
    can_purchase = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'full_name', 'phone_number',
            'groups', 'worksite', 'worksite_name', 'division', 'division_name',
            'supervisor', 'supervisor_name', 'is_staff', 'is_active', 'is_superuser',
            'permissions', 'user_permissions', 'created_at', 'deleted_at',
            'is_supervisor', 'subordinate_count', 'can_purchase'
        ]
        read_only_fields = ['created_at', 'deleted_at', 'permissions', 'user_permissions', 'full_name',
                           'is_supervisor', 'subordinate_count', 'can_purchase']
        
    def validate(self, attrs):
        """Validate that either username is provided or both first_name and last_name"""
        username = attrs.get('username', '')
        first_name = attrs.get('first_name', '')
        last_name = attrs.get('last_name', '')
        
        # If this is an update and we have an instance
        if self.instance:
            username = username or self.instance.username
            first_name = first_name or self.instance.first_name
            last_name = last_name or self.instance.last_name
        
        if not username and (not first_name or not last_name):
            raise serializers.ValidationError(
                "Either username must be provided, or both first_name and last_name are required"
            )
        
        return attrs
    
    def create(self, validated_data):
        """Create user with optional username generation"""
        # Remove empty username so the model's save method can generate it
        if not validated_data.get('username'):
            validated_data.pop('username', None)
        
        return super().create(validated_data)
        
    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_groups(self, obj):
        return [{'id': g.id, 'name': g.name} for g in obj.groups.all()]
    
    def get_permissions(self, obj):
        # Only return permissions in detail view or for current user
        request = self.context.get('request')
        if request and (request.user == obj or request.user.is_superuser):
            return list(obj.get_all_permissions())
        return []
    
    def get_user_permissions(self, obj):
        # Return individual user permissions (not from groups)
        request = self.context.get('request')
        if request and (request.user == obj or request.user.is_superuser):
            return [{'id': p.id, 'name': p.name, 'codename': p.codename}
                    for p in obj.user_permissions.all()]
        return []

    def get_is_supervisor(self, obj):
        """Return True if user has direct reports"""
        return obj.has_subordinates()

    def get_subordinate_count(self, obj):
        """Return count of direct reports only"""
        return obj.direct_reports.filter(deleted_at__isnull=True).count()

    def get_can_purchase(self, obj):
        """Return True if user has purchasing permissions"""
        return obj.can_purchase()


class GroupSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = ['id', 'name', 'user_count', 'permissions']
    
    def get_user_count(self, obj):
        return obj.user_set.count()
    
    def get_permissions(self, obj):
        return [{'id': p.id, 'name': p.name, 'codename': p.codename} 
                for p in obj.permissions.all()]