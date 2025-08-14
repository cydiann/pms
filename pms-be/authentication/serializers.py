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
    username = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'full_name', 'phone_number',
            'groups', 'worksite', 'worksite_name', 'division', 'division_name',
            'supervisor', 'supervisor_name', 'is_staff', 'is_active', 'is_superuser',
            'permissions', 'created_at', 'deleted_at'
        ]
        read_only_fields = ['created_at', 'deleted_at', 'permissions', 'full_name']
        
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
        if request and (request.user == obj or request.user.is_staff):
            return list(obj.get_all_permissions())
        return []


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