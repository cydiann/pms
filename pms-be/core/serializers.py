from rest_framework import serializers


class SystemStatsSerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    inactive_users = serializers.IntegerField()
    admin_users = serializers.IntegerField()
    
    total_worksites = serializers.IntegerField()
    total_divisions = serializers.IntegerField()
    
    total_requests = serializers.IntegerField()
    pending_requests = serializers.IntegerField()
    approved_requests = serializers.IntegerField()
    rejected_requests = serializers.IntegerField()
    completed_requests = serializers.IntegerField()
    
    requests_by_status = serializers.DictField()
    requests_by_category = serializers.DictField()
    
    worksites_with_users = serializers.ListField()
    divisions_with_users = serializers.ListField()
    
    monthly_trends = serializers.DictField()
    top_requesters = serializers.ListField()


class WorksiteStatsSerializer(serializers.Serializer):
    worksite_id = serializers.IntegerField()
    worksite_name = serializers.CharField()
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    inactive_users = serializers.IntegerField()
    total_requests = serializers.IntegerField()
    requests_by_status = serializers.DictField()


class DivisionStatsSerializer(serializers.Serializer):
    division_id = serializers.IntegerField()
    division_name = serializers.CharField()
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    inactive_users = serializers.IntegerField()
    total_requests = serializers.IntegerField()
    requests_by_status = serializers.DictField()