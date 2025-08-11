#!/bin/bash

# Wait for database to be ready
echo "Waiting for database..."
until python manage.py check --database default > /dev/null 2>&1; do
  echo "Database not ready, waiting..."
  sleep 1
done
echo "Database is ready!"

# Run migrations
echo "Running migrations..."
python manage.py migrate

# Check if we have initial data, if not create it
echo "Checking for initial data..."
python manage.py shell -c "
from authentication.models import User
if not User.objects.filter(username='admin').exists():
    print('No initial data found, creating...')
    exit(1)
else:
    print('Initial data already exists')
    exit(0)
"

# If no initial data exists, create it
if [ $? -eq 1 ]; then
    echo "Creating initial test data..."
    python manage.py shell -c "
from authentication.models import User
from organization.models import Worksite, Division
from django.contrib.auth.models import Group, Permission
from django.contrib.auth.hashers import make_password
import os

# Function to setup default groups
def setup_default_request_groups():
    groups_and_permissions = {
        'Administrator': [
            'add_user', 'change_user', 'delete_user', 'view_user',
            'add_group', 'change_group', 'delete_group', 'view_group',
            'add_request', 'change_request', 'delete_request', 'view_request',
            'add_worksite', 'change_worksite', 'delete_worksite', 'view_worksite',
        ],
        'Supervisor': [
            'add_request', 'change_request', 'view_request',
            'view_user', 'view_worksite',
        ],
        'Employee': [
            'add_request', 'view_request',
        ],
        'Purchasing Team': [
            'change_request', 'view_request',
            'view_user', 'view_worksite',
        ]
    }
    
    for group_name, permissions in groups_and_permissions.items():
        group, created = Group.objects.get_or_create(name=group_name)
        if created:
            print(f'Created group: {group_name}')
        
        # Add permissions to group (if they exist)
        for perm_codename in permissions:
            try:
                permission = Permission.objects.get(codename=perm_codename)
                group.permissions.add(permission)
            except Permission.DoesNotExist:
                pass  # Permission doesn't exist, skip it

# Set up groups first
setup_default_request_groups()

# Create admin user
admin, created = User.objects.get_or_create(
    username='admin',
    defaults={
        'first_name': 'System',
        'last_name': 'Administrator', 
        'password': make_password('admin123'),
        'is_staff': True,
        'is_superuser': True
    }
)
if created:
    print('✓ Admin user created: admin/admin123')

# Create test worksite
worksite, created = Worksite.objects.get_or_create(
    address='123 Construction Ave',
    city='Main Construction Site',
    defaults={'country': 'USA'}
)
if created:
    print(f'✓ Worksite created: {worksite.city}')

# Get groups for user assignment
try:
    employee_group = Group.objects.get(name='Employee')
    supervisor_group = Group.objects.get(name='Supervisor') 
    purchasing_group = Group.objects.get(name='Purchasing Team')
    admin_group = Group.objects.get(name='Administrator')
except Group.DoesNotExist:
    print('Groups not found, creating basic ones...')
    employee_group = Group.objects.create(name='Employee')
    supervisor_group = Group.objects.create(name='Supervisor')
    purchasing_group = Group.objects.create(name='Purchasing Team')
    admin_group = Group.objects.create(name='Administrator')

# Create test users hierarchy
# CEO (top level)
ceo, created = User.objects.get_or_create(
    username='ceo',
    defaults={
        'first_name': 'John',
        'last_name': 'CEO',
        'password': make_password('ceo123'),
        'worksite': worksite,
        'supervisor': None
    }
)
if created:
    ceo.groups.add(admin_group)
    print('✓ CEO user created: ceo/ceo123')

# Site Manager (reports to CEO)
manager, created = User.objects.get_or_create(
    username='manager',
    defaults={
        'first_name': 'Jane',
        'last_name': 'Manager',
        'password': make_password('manager123'),
        'worksite': worksite,
        'supervisor': ceo
    }
)
if created:
    manager.groups.add(supervisor_group)
    print('✓ Manager user created: manager/manager123')

# Purchasing Manager (reports to CEO) 
purchasing, created = User.objects.get_or_create(
    username='purchasing',
    defaults={
        'first_name': 'Bob',
        'last_name': 'Purchasing',
        'password': make_password('purchasing123'),
        'worksite': worksite,
        'supervisor': ceo
    }
)
if created:
    purchasing.groups.add(purchasing_group)
    print('✓ Purchasing user created: purchasing/purchasing123')

# Team Leader (reports to Manager)
leader, created = User.objects.get_or_create(
    username='leader',
    defaults={
        'first_name': 'Alice',
        'last_name': 'Leader',
        'password': make_password('leader123'),
        'worksite': worksite,
        'supervisor': manager
    }
)
if created:
    leader.groups.add(supervisor_group)
    print('✓ Leader user created: leader/leader123')

# Engineer (reports to Leader)
engineer, created = User.objects.get_or_create(
    username='engineer',
    defaults={
        'first_name': 'Mike',
        'last_name': 'Engineer',
        'password': make_password('engineer123'),
        'worksite': worksite,
        'supervisor': leader
    }
)
if created:
    engineer.groups.add(employee_group)
    print('✓ Engineer user created: engineer/engineer123')

# Worker (reports to Leader)
worker, created = User.objects.get_or_create(
    username='worker',
    defaults={
        'first_name': 'Sarah',
        'last_name': 'Worker',
        'password': make_password('worker123'),
        'worksite': worksite,
        'supervisor': leader
    }
)
if created:
    worker.groups.add(employee_group)
    print('✓ Worker user created: worker/worker123')

# Create divisions
divisions_data = [
    {'name': 'Engineering'},
    {'name': 'Construction'}, 
    {'name': 'Safety'},
    {'name': 'Administration'},
]

for div_data in divisions_data:
    division, created = Division.objects.get_or_create(
        name=div_data['name'],
        defaults={'created_by': ceo}
    )
    if created:
        division.worksites.add(worksite)
        print(f'✓ Division created: {division.name}')

print('')
print('🎉 Initial setup complete!')
print('')
print('=== Test Users Hierarchy ===')
print('CEO (ceo/ceo123) - Administrator')
print('├── Site Manager (manager/manager123) - Supervisor')
print('│   └── Team Leader (leader/leader123) - Supervisor')
print('│       ├── Engineer (engineer/engineer123) - Employee')
print('│       └── Worker (worker/worker123) - Employee')
print('└── Purchasing Manager (purchasing/purchasing123) - Purchasing Team')
print('')
print('=== Access Information ===')
print('Admin Panel: http://localhost:8000/admin/')
print('  Username: admin')
print('  Password: admin123')
print('')
print('API Base URL: http://localhost:8000/api/')
print('JWT Login Endpoint: http://localhost:8000/api/token/')
print('')
print('💡 Use the Postman collection to test all API endpoints!')
"
fi

# Start the Django development server
echo "Starting Django development server..."
python manage.py runserver 0.0.0.0:8000