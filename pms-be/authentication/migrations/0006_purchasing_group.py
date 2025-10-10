from django.db import migrations


def create_purchasing_group(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Permission = apps.get_model('auth', 'Permission')

    group, _ = Group.objects.get_or_create(name='Purchasing')

    # Assign common permissions for procurement documents
    perms = Permission.objects.filter(
        content_type__app_label='requisition',
        codename__in=[
            'add_procurementdocument',
            'change_procurementdocument',
            'delete_procurementdocument',
            'view_procurementdocument',
        ],
    )
    group.permissions.add(*perms)


def remove_purchasing_group(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Group.objects.filter(name='Purchasing').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('authentication', '0005_user_phone_number'),
        ('requisition', '0002_procurementdocument'),
    ]

    operations = [
        migrations.RunPython(create_purchasing_group, remove_purchasing_group),
    ]

