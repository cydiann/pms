# Django Backend - Purchasing Application

## Project Overview
Build a Django REST API backend for a procurement management system. This backend serves both a React Native mobile app (primary interface) and a desktop admin panel. Focus on simplicity and clear API design.

## Database Models

### Core Models
```python
# models.py
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    role = models.ForeignKey('Role', on_delete=models.SET_NULL, null=True)
    supervisor = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    worksite = models.ForeignKey('Worksite', on_delete=models.SET_NULL, null=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Role(models.Model):
    name = models.CharField(max_length=50)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)

class Worksite(models.Model):
    address = models.TextField()
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=50, default='Turkey')
    chief = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    division = models.ManyToManyField('Division', on_delete=models.SET_NULL, null=True, blank=True)

class Division(models.Model):
    name = models.CharField(max_length=100)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    worksites = models.ManyToManyField(Worksite, blank=True)

class Request(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('purchasing', 'Purchasing'),
        ('revision', 'Revision Requested'),
        ('rejected', 'Rejected'),
        ('ordered', 'Order Placed'),
        ('delivered', 'Delivered'),
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
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    latest_approval = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES)
    category = models.CharField(max_length=100, blank=True)
    delivery_address = models.TextField(blank=True)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ApprovalHistory(models.Model):
    request = models.ForeignKey(Request, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(max_length=20)
    notes = models.TextField(blank=True)
    approved_at = models.DateTimeField(auto_now_add=True)

class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    table_name = models.CharField(max_length=50)
    record_id = models.IntegerField()
    action = models.CharField(max_length=20)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
```

## API Design

### Authentication
```python
# Use Django REST Framework with JWT
# POST /api/auth/login/
# POST /api/auth/logout/
# POST /api/auth/refresh/
# POST /api/auth/password-reset/
```

### Core Endpoints
```python
# Users & Organization
GET    /api/users/                 # List users (admin only)
POST   /api/users/                 # Create user (admin only)
GET    /api/users/me/              # Current user profile
PUT    /api/users/me/              # Update profile
GET    /api/users/{id}/view-as/    # Admin: view as specific user

GET    /api/worksites/             # List worksites
GET    /api/divisions/             # List divisions
GET    /api/roles/                 # List roles

# Requests (Main functionality)
GET    /api/requests/              # List requests (filtered by user permissions)
POST   /api/requests/              # Create new request
GET    /api/requests/{id}/         # Request details
PUT    /api/requests/{id}/         # Update request
DELETE /api/requests/{id}/         # Cancel request

POST   /api/requests/{id}/approve/ # Approve request
POST   /api/requests/{id}/reject/  # Reject request
GET    /api/requests/{id}/history/ # Approval history

# Admin only
GET    /api/admin/audit-logs/      # System audit logs
GET    /api/admin/stats/           # Dashboard statistics
```

## Serializers
```python
# serializers.py
from rest_framework import serializers

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 
                 'email', 'role', 'worksite', 'supervisor']
        
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

class RequestSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Request
        fields = '__all__'
        read_only_fields = ['request_number', 'created_by', 'created_at', 'updated_at']

class RequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Request
        fields = ['item', 'description', 'quantity', 'unit', 'category', 'delivery_address', 'reason']

class ApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalHistory
        fields = '__all__'
```

## Views
```python
# views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def view_as(self, request, pk=None):
        # Admin feature: view app as specific user
        target_user = self.get_object()
        # Return user context for admin to see their permissions/data
        serializer = self.get_serializer(target_user)
        return Response({
            'user': serializer.data,
            'permissions': self.get_user_permissions(target_user),
            'accessible_requests': self.get_user_requests(target_user)
        })

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
        )
    
    def perform_create(self, serializer):
        # Auto-generate request number
        request_number = self.generate_request_number()
        serializer.save(created_by=self.request.user, request_number=request_number)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        request_obj = self.get_object()
        # Approval logic based on user role
        if self.can_approve(request.user, request_obj):
            request_obj.status = 'purchasing'  # or next status in workflow
            request_obj.save()
            
            # Log approval
            ApprovalHistory.objects.create(
                request=request_obj,
                role=request.user.role,
                user=request.user,
                status='approved',
                notes=request.data.get('notes', '')
            )
            
            return Response({'status': 'approved'})
        return Response({'error': 'Not authorized'}, status=403)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        request_obj = self.get_object()
        if self.can_approve(request.user, request_obj):
            request_obj.status = 'rejected'
            request_obj.save()
            
            ApprovalHistory.objects.create(
                request=request_obj,
                role=request.user.role,
                user=request.user,
                status='rejected',
                notes=request.data.get('notes', '')
            )
            
            return Response({'status': 'rejected'})
        return Response({'error': 'Not authorized'}, status=403)
```

## Settings & Configuration
```python
# settings.py key additions
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'purchasing',  # main app
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20
}

AUTH_USER_MODEL = 'purchasing.User'

# JWT Settings
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}
```

## Development Phases

### Phase 1: Core Backend (Week 1)
1. Set up Django project with models
2. Create basic authentication endpoints
3. Implement user management APIs
4. Add request CRUD operations
5. Basic approval workflow

### Phase 2: Admin Features (Week 2)
1. Admin user management
2. "View as user X" functionality
3. Audit logging system
4. Dashboard statistics API
5. Role and permission management

### Phase 3: Business Logic (Week 3)
1. Complete approval workflow engine
2. Request status transitions
3. Notification system (email/push)
4. Data validation and business rules
5. Export functionality

### Phase 4: Production Ready (Week 4)
1. Security hardening
2. Performance optimization
3. Error handling and logging
4. API documentation
5. Testing suite

## Key Implementation Notes

### Simple & Iterative Approach
- Start with basic CRUD operations
- Add complexity incrementally
- Focus on core user stories first
- Simple permission system initially

### Admin "View As" Feature
```python
def view_as_user(admin_user, target_user_id):
    # Return filtered data as if admin is the target user
    # Useful for debugging user experience issues
    pass
```

### Security Considerations
- JWT token authentication
- Role-based permissions
- Input validation on all endpoints
- Audit logging for sensitive operations
- Rate limiting on authentication endpoints

### Performance
- Database indexing on frequently queried fields
- Pagination for list endpoints
- Efficient queryset filtering
- Caching for reference data (roles, worksites)

This backend provides a solid foundation that can be extended iteratively while maintaining simplicity and clear API design.