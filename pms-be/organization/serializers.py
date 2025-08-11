from rest_framework import serializers
from .models import Worksite, Division


class WorksiteSerializer(serializers.ModelSerializer):
    chief_name = serializers.CharField(source='chief.get_full_name', read_only=True)
    
    class Meta:
        model = Worksite
        fields = ['id', 'address', 'city', 'country', 'chief', 'chief_name']


class DivisionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Division
        fields = ['id', 'name', 'created_by', 'created_by_name', 'worksites']