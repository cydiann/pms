from rest_framework import serializers
from django.contrib.auth.models import Group
from .models import User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    supervisor_name = serializers.CharField(source='supervisor.get_full_name', read_only=True)
    worksite_name = serializers.CharField(source='worksite.__str__', read_only=True)
    groups = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'full_name', 
            'email', 'groups', 'worksite', 'worksite_name',
            'supervisor', 'supervisor_name', 'is_staff', 'is_active', 'is_superuser',
            'permissions', 'created_at', 'deleted_at'
        ]
        read_only_fields = ['created_at', 'deleted_at', 'permissions', 'full_name', ]
        
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