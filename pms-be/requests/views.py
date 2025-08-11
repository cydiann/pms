from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from datetime import datetime
import uuid

from .models import Request, ApprovalHistory, AuditLog
from .serializers import (
    RequestSerializer, RequestCreateSerializer, RequestUpdateSerializer,
    ApprovalHistorySerializer, AuditLogSerializer
)


class RequestViewSet(viewsets.ModelViewSet):
    serializer_class = RequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Request.objects.all()
        # Filter by user's worksite and permissions
        return Request.objects.filter(
            created_by__worksite=user.worksite
        ).order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return RequestCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return RequestUpdateSerializer
        return RequestSerializer
    
    def perform_create(self, serializer):
        # Auto-generate request number
        request_number = self.generate_request_number()
        serializer.save(
            created_by=self.request.user, 
            request_number=request_number
        )
    
    def generate_request_number(self):
        # Generate unique request number: REQ-YYYY-XXXXXX
        year = datetime.now().year
        unique_id = str(uuid.uuid4())[:6].upper()
        return f"REQ-{year}-{unique_id}"
    
    def can_approve(self, user, request_obj):
        # Users can approve if they are in the approval chain above the requester
        if user.is_staff:
            return True
        
        # Check if user is in the approval chain (supervisor hierarchy)
        approval_chain = request_obj.get_approval_chain()
        if user in approval_chain:
            return True
            
        return False
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        request_obj = self.get_object()
        
        if not self.can_approve(request.user, request_obj):
            return Response(
                {'error': 'Not authorized to approve this request'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        with transaction.atomic():
            # Update request status
            if request_obj.status == 'pending':
                request_obj.status = 'purchasing'
            elif request_obj.status == 'purchasing':
                request_obj.status = 'ordered'
            
            # Remove the role reference - we'll track approval through ApprovalHistory
            request_obj.save()
            
            # Log approval using the model's transition method
            try:
                request_obj.transition_to(request_obj.status, request.user, request.data.get('notes', ''))
            except ValueError:
                # If transition fails, still log the approval attempt
                ApprovalHistory.objects.create(
                    request=request_obj,
                    user=request.user,
                    action='approved',
                    level=request_obj.get_approval_level(request.user),
                    notes=request.data.get('notes', '')
                )
        
        return Response({
            'status': 'approved', 
            'new_status': request_obj.status
        })
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        request_obj = self.get_object()
        
        if not self.can_approve(request.user, request_obj):
            return Response(
                {'error': 'Not authorized to reject this request'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        with transaction.atomic():
            request_obj.status = 'rejected'
            request_obj.save()
            
            # Log rejection using the model's transition method
            try:
                request_obj.transition_to('rejected', request.user, request.data.get('notes', ''))
            except ValueError:
                # If transition fails, still log the rejection
                ApprovalHistory.objects.create(
                    request=request_obj,
                    user=request.user,
                    action='rejected',
                    level=request_obj.get_approval_level(request.user),
                    notes=request.data.get('notes', '')
                )
        
        return Response({'status': 'rejected'})
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit a draft request for approval"""
        request_obj = self.get_object()
        
        # Only the creator can submit their own draft
        if request_obj.created_by != request.user:
            return Response(
                {'error': 'Only the request creator can submit'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request_obj.status != 'draft':
            return Response(
                {'error': 'Only draft requests can be submitted'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            try:
                request_obj.transition_to('pending', request.user, request.data.get('notes', ''))
                request_obj.submitted_at = datetime.now()
                request_obj.save()
            except ValueError as e:
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response({
            'status': 'submitted',
            'new_status': request_obj.status,
            'message': 'Request submitted for approval'
        })
    
    @action(detail=True, methods=['post'])
    def request_revision(self, request, pk=None):
        """Request revision of a submitted request"""
        request_obj = self.get_object()
        
        if not self.can_approve(request.user, request_obj):
            return Response(
                {'error': 'Not authorized to request revision'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request_obj.status not in ['pending', 'in_review']:
            return Response(
                {'error': 'Can only request revision for pending or in-review requests'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            try:
                request_obj.transition_to('revision_requested', request.user, request.data.get('notes', ''))
                request_obj.revision_count += 1
                request_obj.revision_notes = request.data.get('revision_reason', '')
                request_obj.save()
            except ValueError as e:
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response({
            'status': 'revision_requested',
            'message': 'Revision requested',
            'revision_count': request_obj.revision_count
        })
    
    @action(detail=True, methods=['post'])
    def mark_purchased(self, request, pk=None):
        """Mark request as purchased (purchasing team)"""
        request_obj = self.get_object()
        
        # Check if user has purchasing permissions or is staff
        if not (request.user.is_staff or request.user.groups.filter(name__icontains='purchasing').exists()):
            return Response(
                {'error': 'Only purchasing team can mark as purchased'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request_obj.status not in ['approved', 'purchasing']:
            return Response(
                {'error': 'Can only mark approved or purchasing requests as purchased'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            try:
                request_obj.transition_to('ordered', request.user, request.data.get('notes', ''))
            except ValueError as e:
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response({
            'status': 'ordered',
            'message': 'Request marked as purchased/ordered'
        })
    
    @action(detail=True, methods=['post'])
    def mark_delivered(self, request, pk=None):
        """Mark request as delivered"""
        request_obj = self.get_object()
        
        # Check if user has purchasing permissions or is staff
        if not (request.user.is_staff or request.user.groups.filter(name__icontains='purchasing').exists()):
            return Response(
                {'error': 'Only purchasing team can mark as delivered'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request_obj.status != 'ordered':
            return Response(
                {'error': 'Can only mark ordered requests as delivered'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            try:
                request_obj.transition_to('delivered', request.user, request.data.get('notes', ''))
            except ValueError as e:
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response({
            'status': 'delivered',
            'message': 'Request marked as delivered'
        })
    
    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """Get current user's requests"""
        user_requests = Request.objects.filter(created_by=request.user).order_by('-created_at')
        serializer = self.get_serializer(user_requests, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Get requests pending approval by current user"""
        # Get requests where current user can approve
        pending_requests = []
        for req in Request.objects.filter(status__in=['pending', 'in_review']):
            if self.can_approve(request.user, req):
                pending_requests.append(req)
        
        serializer = self.get_serializer(pending_requests, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def purchasing_queue(self, request):
        """Get requests ready for purchasing"""
        # Check if user has purchasing permissions
        if not (request.user.is_staff or request.user.groups.filter(name__icontains='purchasing').exists()):
            return Response(
                {'error': 'Only purchasing team can access purchasing queue'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        purchasing_requests = Request.objects.filter(status__in=['approved', 'purchasing']).order_by('-created_at')
        serializer = self.get_serializer(purchasing_requests, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        request_obj = self.get_object()
        history = ApprovalHistory.objects.filter(
            request=request_obj
        ).order_by('-approved_at')
        
        serializer = ApprovalHistorySerializer(history, many=True)
        return Response(serializer.data)


class ApprovalHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ApprovalHistory.objects.all()
    serializer_class = ApprovalHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return ApprovalHistory.objects.all()
        # Filter by user's worksite
        return ApprovalHistory.objects.filter(
            request__created_by__worksite=self.request.user.worksite
        )


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAdminUser]
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        # Dashboard statistics
        total_requests = Request.objects.count()
        pending_requests = Request.objects.filter(status='pending').count()
        approved_requests = Request.objects.filter(status='purchasing').count()
        rejected_requests = Request.objects.filter(status='rejected').count()
        
        return Response({
            'total_requests': total_requests,
            'pending_requests': pending_requests,
            'approved_requests': approved_requests,
            'rejected_requests': rejected_requests,
        })
