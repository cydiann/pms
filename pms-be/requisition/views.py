from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from datetime import datetime
from django.utils import timezone
import uuid

from .models import Request, ApprovalHistory, AuditLog, ProcurementDocument
from .serializers import (
    RequestSerializer, RequestCreateSerializer, RequestUpdateSerializer,
    ApprovalHistorySerializer, AuditLogSerializer,
    ProcurementDocumentSerializer, CreateDocumentSerializer, ConfirmUploadSerializer
)
from .filters import RequestFilter, ApprovalHistoryFilter, AuditLogFilter
from organization.models import Worksite, Division
from .storage import get_storage

class RequestViewSet(viewsets.ModelViewSet):
    serializer_class = RequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = RequestFilter
    search_fields = ['item', 'description', 'category', 'reason', 'request_number', 'created_by__username', 'created_by__first_name', 'created_by__last_name']
    ordering_fields = ['created_at', 'submitted_at', 'updated_at', 'status', 'quantity', 'item', 'category', 'revision_count']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Request.objects.all()

        # Regular users only see their own requests in the main list
        # Use specialized endpoints for team/approval views
        return Request.objects.filter(
            created_by=user
        ).order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return RequestCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return RequestUpdateSerializer
        return RequestSerializer
    
    def create(self, request, *args, **kwargs):
        # Use CreateSerializer for input validation
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Auto-generate request number
        request_number = self.generate_request_number()
        instance = serializer.save(
            created_by=request.user, 
            request_number=request_number
        )
        
        # Use full RequestSerializer for response
        response_serializer = RequestSerializer(instance)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=201, headers=headers)
    
    def generate_request_number(self):
        # Generate unique request number: REQ-YYYY-XXXXXX
        year = timezone.now().year
        unique_id = str(uuid.uuid4())[:6].upper()
        return f"REQ-{year}-{unique_id}"
    
    def can_approve(self, user, request_obj):
        # Users can approve if they are in the approval chain above the requester
        if user.is_superuser:
            return True
        
        # Check if user is in the approval chain (supervisor hierarchy)
        approval_chain = request_obj.get_approval_chain()
        if user in approval_chain:
            return True
            
        return False
    
    @action(detail=True, methods=['post'], url_path='approve', url_name='approve')
    def approve(self, request, pk=None):
        # For approval actions, get the request regardless of ownership
        try:
            request_obj = Request.objects.get(pk=pk)
        except Request.DoesNotExist:
            return Response(
                {'detail': 'Request not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # First check if request is in a valid state for approval
        if request_obj.status not in ['pending', 'in_review']:
            # Use 400 for invalid state transitions, 403 for permission/logic issues
            if request_obj.status == 'draft':
                return Response({
                    'error': 'Cannot approve draft request - must be submitted first'
                }, status=status.HTTP_403_FORBIDDEN)
            elif request_obj.status == 'approved':
                return Response({
                    'error': 'This request is already fully approved'
                }, status=status.HTTP_403_FORBIDDEN)
            else:
                return Response({
                    'error': f'Cannot approve request in {request_obj.status} status'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Check if user is the next approver
        next_approver = request_obj.get_next_approver()
        if next_approver != request.user and not request.user.is_superuser:
            if next_approver:
                return Response({
                    'error': f'This request is pending approval from {next_approver.get_full_name()}'
                }, status=status.HTTP_403_FORBIDDEN)
            else:
                return Response({
                    'error': 'This request is already fully approved'
                }, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            # Update approval tracking
            request_obj.last_approver = request.user
            request_obj.approval_level += 1

            # Determine new status
            if request_obj.is_fully_approved():
                new_status = 'approved'  # Ready for purchasing
            else:
                new_status = 'in_review'  # More approvals needed

            # Update status only if it needs to change
            if request_obj.status != new_status:
                try:
                    request_obj.transition_to(new_status, request.user, request.data.get('notes', ''))
                except ValueError as e:
                    return Response(
                        {'error': str(e)},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                # Status doesn't need to change, but still record the approval history
                request_obj.save()
                ApprovalHistory.objects.create(
                    request=request_obj,
                    user=request.user,
                    action='approved',
                    level=request_obj.approval_level,
                    notes=request.data.get('notes', '')
                )

        return Response({
            'status': 'approved',
            'new_status': request_obj.status,
            'approval_level': request_obj.approval_level,
            'next_approver': request_obj.get_next_approver().get_full_name() if request_obj.get_next_approver() else None,
            'is_fully_approved': request_obj.is_fully_approved()
        })
    
    @action(detail=True, methods=['post'], url_path='reject', url_name='reject')
    def reject(self, request, pk=None):
        # For approval actions, get the request regardless of ownership
        request_obj = Request.objects.get(pk=pk)

        # First check if request is in a valid state for rejection
        if request_obj.status not in ['pending', 'in_review', 'approved', 'purchasing']:
            return Response({
                'error': f'Cannot reject request in {request_obj.status} status'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if user is the next approver or superuser
        next_approver = request_obj.get_next_approver()
        if next_approver != request.user and not request.user.is_superuser:
            return Response(
                {'error': 'Not authorized to reject this request'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        with transaction.atomic():
            # Use transition method properly
            try:
                request_obj.transition_to('rejected', request.user, request.data.get('notes', ''))
            except ValueError as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response({'status': 'rejected'})
    
    @action(detail=True, methods=['post'], url_path='submit', url_name='submit')
    def submit(self, request, pk=None):
        """Submit a draft request for approval"""
        request_obj = self.get_object()
        
        # Only the creator can submit their own draft
        if request_obj.created_by != request.user:
            return Response(
                {'error': 'Only the request creator can submit'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request_obj.status not in ['draft', 'revision_requested']:
            return Response(
                {'error': 'Only draft or revision-requested requests can be submitted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            try:
                request_obj.transition_to('pending', request.user, request.data.get('notes', ''))
                request_obj.submitted_at = timezone.now()
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
    
    @action(detail=True, methods=['post'], url_path='request-revision', url_name='request-revision')
    def request_revision(self, request, pk=None):
        """Request revision of a submitted request"""
        # For approval actions, get the request regardless of ownership
        request_obj = Request.objects.get(pk=pk)

        # Check if user is the next approver or superuser
        next_approver = request_obj.get_next_approver()
        if next_approver != request.user and not request.user.is_superuser:
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
    
    @action(detail=True, methods=['post'], url_path='mark-purchased', url_name='mark-purchased')
    def mark_purchased(self, request, pk=None):
        """Mark request as purchased (purchasing team)"""
        # For purchasing actions, get the request regardless of ownership
        request_obj = Request.objects.get(pk=pk)
        
        # Check if user has purchasing permissions or is superuser
        if not (request.user.is_superuser or request.user.can_purchase()):
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
                # If approved, first move to purchasing state, then to ordered
                if request_obj.status == 'approved':
                    # Skip intermediate state and go directly to ordered, but record it correctly
                    request_obj.status = 'purchasing'  # Set intermediate state without transition
                    request_obj.save()

                # Then transition to ordered (this will create the history entry)
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
    
    @action(detail=True, methods=['post'], url_path='mark-delivered', url_name='mark-delivered')
    def mark_delivered(self, request, pk=None):
        """Mark request as delivered"""
        # For purchasing actions, get the request regardless of ownership
        request_obj = Request.objects.get(pk=pk)
        
        # Check if user has purchasing permissions or is superuser
        if not (request.user.is_superuser or request.user.can_purchase()):
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
    
    @action(detail=False, methods=['get'], url_path='my-requests', url_name='my-requests')
    def my_requests(self, request):
        """Get current user's requests"""
        user_requests = Request.objects.filter(created_by=request.user).order_by('-created_at')
        
        # Apply pagination
        page = self.paginate_queryset(user_requests)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        # Fallback if pagination is not configured
        serializer = self.get_serializer(user_requests, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='pending-approvals', url_name='pending-approvals')
    def pending_approvals(self, request):
        """Get requests pending approval by current user"""
        # Get requests where current user is the next approver
        pending_requests = []
        for req in Request.objects.filter(status__in=['pending', 'in_review']):
            if req.get_next_approver() == request.user:
                pending_requests.append(req)

        # Convert to QuerySet for pagination
        request_ids = [req.id for req in pending_requests]
        queryset = Request.objects.filter(id__in=request_ids).order_by('-created_at')

        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        # Fallback if pagination is not configured
        serializer = self.get_serializer(pending_requests, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='my-team-requests', url_name='my-team-requests')
    def my_team_requests(self, request):
        """Get all requests from current user's subordinates (team members)"""
        user = request.user

        # Get all subordinates in the hierarchy
        subordinates = user.get_all_subordinates()

        if not subordinates:
            # No subordinates - return empty result
            return Response([])

        # Get all requests from subordinates
        team_requests = Request.objects.filter(
            created_by__in=subordinates,
            created_by__worksite=user.worksite  # Maintain worksite boundary
        ).order_by('-created_at')

        # Apply pagination
        page = self.paginate_queryset(team_requests)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        # Fallback if pagination is not configured
        serializer = self.get_serializer(team_requests, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='my-approved-requests', url_name='my-approved-requests')
    def my_approved_requests(self, request):
        """Get requests that current user has approved"""
        # Get requests where current user appears in the approval history with 'approved' action
        approved_request_ids = ApprovalHistory.objects.filter(
            user=request.user,
            action='approved'
        ).values_list('request_id', flat=True).distinct()

        # Get the actual request objects
        approved_requests = Request.objects.filter(
            id__in=approved_request_ids
        ).order_by('-created_at')

        # Apply pagination
        page = self.paginate_queryset(approved_requests)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        # Fallback if pagination is not configured
        serializer = self.get_serializer(approved_requests, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='purchasing-queue', url_name='purchasing-queue')
    def purchasing_queue(self, request):
        """Get requests ready for purchasing"""
        # Check if user has purchasing permissions
        if not (request.user.is_superuser or request.user.can_purchase()):
            return Response(
                {'error': 'Only purchasing team can access purchasing queue'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        purchasing_requests = Request.objects.filter(status__in=['approved', 'purchasing']).order_by('-created_at')
        
        # Apply pagination
        page = self.paginate_queryset(purchasing_requests)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        # Fallback if pagination is not configured
        serializer = self.get_serializer(purchasing_requests, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='history', url_name='history')
    def history(self, request, pk=None):
        request_obj = self.get_object()
        history = ApprovalHistory.objects.filter(
            request=request_obj
        ).order_by('-created_at')

        serializer = ApprovalHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='current-approver', url_name='current-approver')
    def current_approver(self, request, pk=None):
        """Get the current approver information for a request"""
        # For approval status, get the request regardless of ownership
        try:
            request_obj = Request.objects.get(pk=pk)
        except Request.DoesNotExist:
            return Response(
                {'detail': 'Request not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get approval status information
        next_approver = request_obj.get_next_approver()

        response_data = {
            'request_id': request_obj.id,
            'request_number': request_obj.request_number,
            'status': request_obj.status,
            'approval_level': request_obj.approval_level,
            'is_fully_approved': request_obj.is_fully_approved(),
            'approval_status_text': request_obj.get_approval_status(),
            'last_approver': None,
            'next_approver': None,
        }

        # Add last approver info
        if request_obj.last_approver:
            response_data['last_approver'] = {
                'id': request_obj.last_approver.id,
                'username': request_obj.last_approver.username,
                'full_name': request_obj.last_approver.get_full_name(),
                'first_name': request_obj.last_approver.first_name,
                'last_name': request_obj.last_approver.last_name,
            }

        # Add next approver info
        if next_approver:
            response_data['next_approver'] = {
                'id': next_approver.id,
                'username': next_approver.username,
                'full_name': next_approver.get_full_name(),
                'first_name': next_approver.first_name,
                'last_name': next_approver.last_name,
            }

        # Add approval chain info for pending/in-review requests
        if request_obj.status in ['pending', 'in_review']:
            # Get full approval chain
            creator = request_obj.created_by
            chain = creator.get_hierarchy_chain() if hasattr(creator, 'get_hierarchy_chain') else []
            supervisors = [user for user in chain if user != creator]

            approval_chain = []
            for i, supervisor in enumerate(supervisors):
                is_approved = i < request_obj.approval_level
                is_current = (i == request_obj.approval_level and not request_obj.is_fully_approved())

                approval_chain.append({
                    'level': i,
                    'approver': {
                        'id': supervisor.id,
                        'username': supervisor.username,
                        'full_name': supervisor.get_full_name(),
                        'first_name': supervisor.first_name,
                        'last_name': supervisor.last_name,
                    },
                    'status': 'approved' if is_approved else ('current' if is_current else 'pending'),
                    'is_current': is_current,
                    'is_approved': is_approved,
                })

            response_data['approval_chain'] = approval_chain
            response_data['total_required_approvals'] = len(supervisors)

        return Response(response_data)


class ApprovalHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ApprovalHistory.objects.all()
    serializer_class = ApprovalHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = ApprovalHistoryFilter
    search_fields = ['request__request_number', 'request__item', 'user__username', 'user__first_name', 'user__last_name', 'notes']
    ordering_fields = ['created_at', 'level', 'action']
    ordering = ['-created_at']
    
    def get_queryset(self):
        if self.request.user.is_superuser:
            return ApprovalHistory.objects.all()
        # Filter by user's worksite
        return ApprovalHistory.objects.filter(
            request__created_by__worksite=self.request.user.worksite
        )


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_class = AuditLogFilter
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'action', 'table_name']
    ordering_fields = ['timestamp', 'action', 'table_name']
    ordering = ['-timestamp']
    
    @action(detail=False, methods=['get'], url_path='stats', url_name='stats')
    def stats(self, request):
        
        User = get_user_model()
        
        # Optimized: Single query for all status counts
        status_counts = Request.objects.values('status').annotate(count=Count('id'))
        requests_by_status = {item['status']: item['count'] for item in status_counts}
        
        # Extract specific counts from the aggregated data
        total_requests = sum(requests_by_status.values())
        pending_requests = requests_by_status.get('pending', 0)
        approved_requests = requests_by_status.get('approved', 0)
        rejected_requests = requests_by_status.get('rejected', 0)
        draft_requests = requests_by_status.get('draft', 0)
        completed_requests = requests_by_status.get('completed', 0)
        
        # Requests by category breakdown  
        category_counts = Request.objects.values('category').annotate(count=Count('id'))
        requests_by_category = {}
        for item in category_counts:
            requests_by_category[item['category']] = item['count']
        
        # Optimized: User statistics with single query
        user_stats = User.objects.aggregate(
            total_users=Count('id'),
            active_users=Count('id', filter=Q(is_active=True))
        )
        
        # Admin specific: all pending approvals (pending + in_review)
        all_pending_approvals = Request.objects.filter(
            status__in=['pending', 'in_review']
        ).count()
        
        return Response({
            # RequestStats interface fields
            'total_requests': total_requests,
            'pending_requests': pending_requests,
            'approved_requests': approved_requests,
            'rejected_requests': rejected_requests,
            'draft_requests': draft_requests,
            'completed_requests': completed_requests,
            'requests_by_status': requests_by_status,
            'requests_by_category': requests_by_category,
            'average_processing_time': 0,  # Can be calculated later if needed
            'monthly_request_count': 0,    # Can be calculated later if needed
            
            # AdminStats interface fields  
            'all_pending_approvals': all_pending_approvals,
            'total_users': user_stats['total_users'],
            'active_users': user_stats['active_users'],
            'total_worksites': Worksite.objects.count(),
            'total_divisions': Division.objects.count(),
        })


class ProcurementDocumentViewSet(viewsets.ModelViewSet):
    queryset = ProcurementDocument.objects.all()
    serializer_class = ProcurementDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['file_name', 'description', 'document_type', 'request__request_number', 'request__item', 'uploaded_by__username', 'uploaded_by__first_name', 'uploaded_by__last_name']
    ordering_fields = ['created_at', 'uploaded_at', 'file_name', 'file_size', 'document_type', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter by request if provided
        request_id = self.request.query_params.get('request')
        if request_id:
            queryset = queryset.filter(request_id=request_id)
        
        # Filter by document type if provided
        doc_type = self.request.query_params.get('document_type')
        if doc_type:
            queryset = queryset.filter(document_type=doc_type)
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Non-admin users can only see documents for their requests or if they have purchase permissions
        if not user.is_superuser and not user.can_purchase():
            # Regular users can only see documents for their requests
            user_requests = Request.objects.filter(created_by=user)
            queryset = queryset.filter(request__in=user_requests)
        
        return queryset.select_related('request', 'uploaded_by')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateDocumentSerializer
        elif self.action == 'confirm_upload':
            return ConfirmUploadSerializer
        return ProcurementDocumentSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Create a new document record and get presigned upload URL.
        
        Request body:
        {
            "request": "request_id",
            "document_type": "quote|purchase_order|dispatch_note|receipt|invoice|other",
            "file_name": "document.pdf",
            "file_size": 1024000,
            "file_type": "application/pdf",
            "description": "Optional description",
            "metadata": {}
        }
        
        Response:
        {
            "id": "document_uuid",
            "upload_url": "https://minio.../presigned-url",
            ...
        }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save()
        
        response_data = ProcurementDocumentSerializer(
            document,
            context={'request': request}
        ).data
        response_data['upload_url'] = document.upload_url
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], url_path='confirm-upload', url_name='confirm-upload')
    def confirm_upload(self, request):
        """
        Confirm that file has been uploaded to MinIO.
        
        Request body:
        {
            "document_id": "uuid"
        }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        success = serializer.save()
        
        if success:
            return Response(
                {"status": "success", "message": "Upload confirmed"},
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {"status": "failed", "message": "File not found in storage"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'], url_path='download', url_name='download')
    def download(self, request, pk=None):
        """Get a fresh download URL for a document."""
        document = self.get_object()
        
        if document.status != 'uploaded':
            return Response(
                {"error": "Document is not available for download"},
                status=status.HTTP_400_BAD_REQUEST
            )

        storage = get_storage()
        if not storage:
            return Response({
                'error': 'File storage is not available'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        download_url = storage.get_presigned_download_url(document.object_name)
        
        return Response({
            "download_url": download_url,
            "file_name": document.file_name,
            "file_type": document.file_type
        })
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete a document."""
        document = self.get_object()
        
        # Check permissions
        user = request.user
        if not (
            user.is_superuser or
            document.uploaded_by == user or
            user.can_purchase()
        ):
            return Response(
                {"error": "You don't have permission to delete this document"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Mark as deleted (soft delete)
        document.mark_deleted()
        
        # Optionally delete from MinIO
        storage = get_storage()
        if storage:
            storage.delete_object(document.object_name)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'], url_path='by-request', url_name='by-request')
    def by_request(self, request):
        """Get all documents for a specific request."""
        request_id = request.query_params.get('request_id')
        if not request_id:
            return Response(
                {"error": "request_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        request_obj = get_object_or_404(Request, pk=request_id)
        
        # Check permissions
        user = request.user
        if not (
            user.is_superuser or
            request_obj.created_by == user or
            user.can_purchase()
        ):
            return Response(
                {"error": "You don't have permission to view documents for this request"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        documents = ProcurementDocument.objects.filter(
            request=request_obj
        ).exclude(status='deleted')
        
        serializer = ProcurementDocumentSerializer(
            documents,
            many=True,
            context={'request': request}
        )
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='test-minio', url_name='test-minio')
    def test_minio(self, request):
        """Test MinIO connection and configuration - DEBUG ONLY"""
        if not request.user.is_superuser:
            return Response(
                {"error": "Only admins can access this test endpoint"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            storage = get_storage()
            if not storage:
                return Response({
                    "status": "error",
                    "message": "MinIO storage is not configured or available"
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            # Test bucket existence
            bucket_exists = storage.client.bucket_exists(storage.bucket_name)
            
            # Test presigned URL generation
            test_object_name = f"test/{uuid.uuid4()}.txt"
            upload_url = storage.get_presigned_upload_url(test_object_name, expiry_seconds=300)
            
            # Get MinIO configuration
            from django.conf import settings
            
            return Response({
                "status": "success",
                "bucket_exists": bucket_exists,
                "bucket_name": storage.bucket_name,
                "minio_endpoint": settings.MINIO_ENDPOINT,
                "minio_public_endpoint": getattr(settings, 'MINIO_PUBLIC_ENDPOINT', None),
                "test_upload_url": upload_url,
                "test_object_name": test_object_name,
                "access_key": settings.MINIO_ACCESS_KEY[:3] + "***",  # Partially mask for security
                "use_ssl": settings.MINIO_USE_SSL
            })
            
        except Exception as e:
            return Response({
                "status": "error",
                "error": str(e),
                "error_type": type(e).__name__
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
