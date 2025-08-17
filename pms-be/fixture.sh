#!/bin/bash

# List of default applications (add your app names here)
default_apps=("auth.Group" "authentication" "organization" "requisition")

# Function to create fixtures for an application
create_fixture() {
  app_name=$1
  if [ ! -d "fixtures" ]; then
    mkdir -p fixtures
  fi
  echo "Creating fixture for $app_name"
  docker-compose exec app python manage.py dumpdata --exclude auth.permission --exclude contenttypes $app_name > fixtures/${app_name}_fixture.json
  echo "Fixture created: fixtures/${app_name}_fixture.json"
}

# Function to load fixtures
load_fixtures() {
  echo "Loading fixtures..."
  if [ -d "fixtures" ]; then
    for fixture in fixtures/*_fixture.json; do
      if [ -f "$fixture" ]; then
        echo "Loading fixture: $fixture"
        docker-compose exec app python manage.py loaddata $fixture
      fi
    done
  else
    echo "No fixtures directory found"
  fi
}

# Function to create initial data
create_initial_data() {
  echo "Creating initial test data..."
  
  docker-compose exec app python manage.py shell -c "
from authentication.models import User
from organization.models import Worksite, Division
from django.contrib.auth.models import Group, Permission
from django.contrib.auth.hashers import make_password
from requisition.permissions import setup_default_request_groups

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
    print('Admin user created: admin/admin123')
else:
    print('Admin user already exists')

# Create test worksite
worksite, created = Worksite.objects.get_or_create(
    address='123 Construction Ave',
    city='Main Construction Site',
    defaults={
        'country': 'USA'
    }
)
if created:
    print(f'Worksite created: {worksite.city}')

# Create divisions (we'll add worksites after creating users)
divisions_data = [
    {'name': 'Engineering'},
    {'name': 'Construction'}, 
    {'name': 'Safety'},
    {'name': 'Administration'},
]

# Set up default groups and permissions
setup_default_request_groups()

# Get groups for user assignment
employee_group = Group.objects.get(name='Employee')
supervisor_group = Group.objects.get(name='Supervisor') 
purchasing_group = Group.objects.get(name='Purchasing Team')
admin_group = Group.objects.get(name='Administrator')

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
    print('CEO user created: ceo/ceo123')

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
    print('Manager user created: manager/manager123')

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
    print('Purchasing user created: purchasing/purchasing123')

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
    print('Leader user created: leader/leader123')

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
    print('Engineer user created: engineer/engineer123')

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
    print('Worker user created: worker/worker123')

# Now create divisions with the CEO as creator
for div_data in divisions_data:
    division, created = Division.objects.get_or_create(
        name=div_data['name'],
        defaults={'created_by': ceo}
    )
    if created:
        division.worksites.add(worksite)
        print(f'Division created: {division.name}')

print('\\n=== Test Users Hierarchy ===')
print('CEO (ceo/ceo123) - Administrator')
print('├── Site Manager (manager/manager123) - Supervisor')
print('│   └── Team Leader (leader/leader123) - Supervisor')
print('│       ├── Engineer (engineer/engineer123) - Employee')
print('│       └── Worker (worker/worker123) - Employee')
print('└── Purchasing Manager (purchasing/purchasing123) - Purchasing Team')
print('\\n=== Admin Access ===')
print('Admin Panel: admin/admin123')
print('API Base URL: http://localhost:8000/api/')
"
}

# Check command line arguments
case "$1" in
  "create")
    # Create fixtures from current data
    if [ -z "$2" ]; then
      echo "Creating fixtures for default applications"
      for app in "${default_apps[@]}"; do
        create_fixture "$app"
      done
    else
      create_fixture "$2"
    fi
    ;;
  "load")
    # Load fixtures into database
    load_fixtures
    ;;
  "init")
    # Create initial test data
    create_initial_data
    ;;
  "reset")
    # Reset database and create initial data
    echo "Resetting database..."
    docker-compose exec app python manage.py flush --noinput
    echo "Running migrations..."
    docker-compose exec app python manage.py migrate
    create_initial_data
    ;;
  *)
    echo "Usage: $0 {create|load|init|reset} [app_name]"
    echo ""
    echo "Commands:"
    echo "  create [app_name]  - Create fixtures from current database data"
    echo "                      If no app_name provided, creates for all default apps"
    echo "  load              - Load all fixtures from fixtures/ directory"
    echo "  init              - Create initial test data (users, roles, worksite)"
    echo "  reset             - Reset database and create initial test data"
    echo ""
    echo "Examples:"
    echo "  $0 init              # Create initial test data"
    echo "  $0 create           # Create fixtures for all apps"
    echo "  $0 create requests  # Create fixture for requests app only"
    echo "  $0 load             # Load all fixtures"
    echo "  $0 reset            # Reset DB and create initial data"
    exit 1
    ;;
esac