# Procurement Management System (PMS) - Backend

## 🏗️ System Architecture

This Django REST API backend serves a procurement management system for worksite operations. The system is designed for simplicity to accommodate non-technical worksite employees while maintaining proper approval hierarchies.

### 📁 Project Structure
```
PMS/
├── authentication/     # User management, roles, password resets
├── organization/       # Worksites, divisions, organizational structure  
├── requests/          # Purchase requests, approval workflow
└── backend/           # Django project settings
```

## 👥 User Management System

### User Hierarchy
The system supports dynamic hierarchical structures:
- **CEO** (top level, no supervisor)
- **Product Manager** → **Team Leader** → **Employee**
- **Site Manager** → **Foreman** → **Worker**
- **VP** → **Director** → **Manager** → **Team Lead** → **Employee**

### User Creation Process
**Only the Admin can create users** through the Django admin panel:

1. **Admin creates user** with basic info:
   - Username (required for login)
   - First name, last name
   - Initial password
   - Worksite assignment
   - Role assignment (optional)
   - Supervisor assignment (creates hierarchy chain)

2. **User receives credentials** from admin/supervisor physically
3. **First login** forces password change

### Role Assignment
- **Admin Role**: Only one admin exists, manages entire system
- **Supervisor Roles**: Regular employees who manage direct reports
- **Employee Roles**: Standard worksite workers
- **Roles are descriptive** (e.g., "Foreman", "Site Manager", "Worker")

### Supervisor Assignment
- Each user has exactly **one supervisor** (except CEO/Admin)
- Supervisor assignment creates the **approval chain**
- System automatically follows hierarchy for approvals
- Supervisors see "My Team" tab with direct reports

## 🔐 Authentication & Password Reset

### Login System
- **Username-based authentication** (no email required)
- **JWT tokens** for API access
- **Simple for worksite employees**

### Password Reset Flow (Super Simple)
1. **Employee**: Clicks "Forgot Password" (no choices, no dropdowns)
2. **System**: Automatically creates request for their supervisor
3. **Supervisor**: Gets notification in "My Team" tab
4. **Supervisor**: Approves → Gets temporary password
5. **Supervisor**: Tells employee the temp password **in person**
6. **Employee**: Uses temp password → Forced to change on first login

**Key Benefits:**
- No security questions to remember
- No employee IDs to remember  
- Human verification through supervisor
- Works offline (verbal communication)

## 📋 Request Workflow System

### Request State Machine

The system uses a strict state machine to prevent invalid transitions:

```
draft → pending → in_review → approved → purchasing → ordered → delivered → completed
   ↓         ↓         ↓           ↓
rejected  rejected  rejected  rejected
   ↓         ↓         ↓
revision_requested → pending (after revision)
```

#### Valid State Transitions
- **draft** → `pending` (submit request)
- **pending** → `in_review`, `approved`, `rejected`, `revision_requested`
- **in_review** → `approved`, `rejected`, `revision_requested`  
- **revision_requested** → `pending` (after revision)
- **approved** → `purchasing`, `rejected` (purchasing team can still reject)
- **purchasing** → `ordered`, `rejected`, `revision_requested`
- **ordered** → `delivered`
- **delivered** → `completed`
- **rejected**, **completed** → no further transitions (final states)

#### 1. **Draft State**
- Employee creates purchase request
- Can edit freely before submission
- Not visible to supervisors yet
- **Transition**: Employee clicks "Submit" → `pending`

#### 2. **Pending State**
- Request submitted to immediate supervisor
- Employee cannot edit anymore
- Supervisor sees in their "My Team" pending approvals
- **Transitions**: Supervisor can → `in_review`, `approved`, `rejected`, `revision_requested`

#### 3. **In Review State**
- Currently being reviewed by a supervisor
- May indicate complex approval process
- **Transitions**: Supervisor can → `approved`, `rejected`, `revision_requested`

#### 4. **Revision Requested State**
- Supervisor wants changes made
- Falls back to **original creator** 
- Creator sees supervisor's feedback notes
- **Revision counter** increments
- **Transition**: After revision → `pending` (restarts approval chain)

#### 5. **Approved State**
- Reached top of hierarchy OR final approver approved
- Ready for purchasing team to handle
- **Status**: `Final Approved - Ready for Purchase`
- **Transitions**: → `purchasing` (auto-assigned), `rejected` (purchasing team can reject)

#### 6. **Purchasing Team Workflow**
After approval, requests enter the purchasing workflow:

**Dynamic Purchasing Team**: Any user with `role.can_purchase = True` can handle approved requests

##### **Purchasing State**
- Request assigned to purchasing team queue
- All purchasing team members can see approved requests
- **Any purchasing team member can:**
  - ✅ **Mark as Ordered**: Create purchase order → `ordered`
  - ❌ **Reject**: Send back with reasons → `rejected`  
  - 📝 **Request Review**: Need more info from requester → `revision_requested`

##### **Ordered State**
- Purchase order placed with vendor
- Tracking information recorded
- **Transition**: When items arrive → `delivered`

##### **Delivered State**  
- Items physically received and verified
- Delivery confirmation recorded
- **Transition**: Process complete → `completed`

##### **Completed State**
- Request fully fulfilled
- Final state - no further actions possible
- Archived for audit trail

#### 7. **Rejected State**
- Request denied at any stage
- **Final state** - cannot be reopened
- Requester must create new request if needed
- Rejection reason preserved in approval history

### Request Fields
```python
# Basic Information
item = "Office Chairs"
description = "Ergonomic chairs for 5 employees"
quantity = 5
unit = "pieces"  # pieces, kg, meter, m2, etc.
category = "Office Furniture"
delivery_address = "Main Office, Building A"
reason = "Current chairs are broken and causing back pain"

# System Fields (auto-generated)
request_number = "REQ-2025-A1B2C3"  # Auto-generated
created_by = User.objects.get(username="john_doe")
current_approver = User.objects.get(username="supervisor")
status = "pending"
```

### Approval History Tracking
Every action is logged:
```python
ApprovalHistory.objects.create(
    request=request,
    user=supervisor,
    action="approved",  # or rejected, revision_requested
    level=1,  # 1=immediate supervisor, 2=manager, etc.
    notes="Approved for purchase",
    review_notes="Please get quotes from 3 vendors"  # For revisions
)
```

## 🌐 API Endpoints

### Authentication Endpoints
```python
POST /api/auth/login/           # Login with username/password
POST /api/auth/refresh/         # Refresh JWT token
GET  /api/auth/users/me/        # Get current user info
GET  /api/auth/users/{id}/view-as/  # Admin: view as specific user
POST /api/auth/password-reset/  # Request password reset
```

### Organization Endpoints  
```python
GET /api/org/worksites/         # List worksites
GET /api/org/divisions/         # List divisions
```

### Request Endpoints
```python
# Employee actions
GET  /api/requests/             # List user's requests
POST /api/requests/             # Create new request
PUT  /api/requests/{id}/        # Update draft request
GET  /api/requests/{id}/        # View request details

# Supervisor actions  
POST /api/requests/{id}/approve/    # Approve request
POST /api/requests/{id}/reject/     # Reject request
POST /api/requests/{id}/revise/     # Request revision
GET  /api/requests/{id}/history/    # View approval history

# Admin actions
GET /api/requests/admin/stats/      # Dashboard statistics
```

## 🔍 User Interface Navigation

### Employee View
```
Dashboard
├── My Requests (created by me)
├── Create New Request  
└── Profile
```

### Supervisor View
```
Dashboard
├── My Requests (created by me)
├── My Team (direct reports)
│   ├── Pending Approvals
│   └── Password Reset Requests
├── Create New Request
└── Profile
```

### Admin View
```
Dashboard
├── All Requests
├── All Users
├── Worksites & Divisions
├── System Statistics
└── Admin Panel Access
```

## 🔧 Key Design Decisions

### 1. **Simplicity First**
- No complex dropdowns or selections
- System automatically determines approval chain
- Visual status indicators
- Minimal required fields

### 2. **Offline-Friendly**
- Password resets work through physical supervisor interaction
- No email dependencies
- Works in poor internet connectivity

### 3. **Audit Trail**
- Every action is logged
- Full approval history preserved
- Revision tracking with feedback
- Cannot delete or modify history

### 4. **Security Through Hierarchy**
- Users only see their level and below
- Supervisors verify identity physically
- No system-wide admin privileges for supervisors
- Single admin maintains control

## 🚀 Development Workflow

### Running the System
```bash
# Start services
docker-compose up -d

# Create migrations (after model changes)
docker-compose exec app python manage.py makemigrations
docker-compose exec app python manage.py migrate

# Create admin user
docker-compose exec app python manage.py createsuperuser

# Access admin panel
http://localhost:8000/admin/

# API documentation
http://localhost:8000/api/
```

### Testing Hierarchy
1. Create CEO user (no supervisor)
2. Create Manager user (supervisor = CEO)  
3. Create Employee user (supervisor = Manager)
4. Test request flow: Employee → Manager → CEO
5. Test password reset: Employee → Manager approves

This system prioritizes **simplicity and human interaction** over complex digital workflows, making it perfect for worksite environments where employees may not be tech-savvy.