# Generated manually to add custom permissions

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('requisition', '0003_remove_request_current_approver_and_more'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='request',
            options={
                'ordering': ['-created_at'],
                'permissions': [
                    ('can_purchase', 'Can handle purchasing tasks'),
                    ('view_all_requests', 'Can view all requests system-wide'),
                ]
            },
        ),
    ]