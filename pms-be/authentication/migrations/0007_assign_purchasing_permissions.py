from django.db import migrations


PURCHASING_GROUP_NAMES = ['Purchasing', 'Purchasing Team', 'Procurement']
PURCHASING_PERMISSION_CODENAMES = [
    'can_purchase',
    'view_purchasing_queue',
    'mark_ordered',
    'mark_delivered',
    'complete_request',
    'reject_request',
    'request_revision',
]


def assign_purchasing_permissions(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Permission = apps.get_model('auth', 'Permission')

    permissions = list(
        Permission.objects.filter(codename__in=PURCHASING_PERMISSION_CODENAMES)
    )
    if not permissions:
        return

    for group in Group.objects.filter(name__in=PURCHASING_GROUP_NAMES):
        group.permissions.add(*permissions)


def revoke_purchasing_permissions(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Permission = apps.get_model('auth', 'Permission')

    permissions = list(
        Permission.objects.filter(codename__in=PURCHASING_PERMISSION_CODENAMES)
    )
    if not permissions:
        return

    for group in Group.objects.filter(name__in=PURCHASING_GROUP_NAMES):
        group.permissions.remove(*permissions)


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0006_purchasing_group'),
        ('requisition', '0005_requestarchive'),
    ]

    operations = [
        migrations.RunPython(assign_purchasing_permissions, revoke_purchasing_permissions),
    ]
