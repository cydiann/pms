"""
Django management command to archive completed requests

This command should be run via cronjob every 2 weeks:
    0 2 */14 * * cd /path/to/pms-be && python manage.py archive_completed_requests

Usage:
    python manage.py archive_completed_requests
    python manage.py archive_completed_requests --weeks=2
    python manage.py archive_completed_requests --start=2025-01-01 --end=2025-01-15
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, datetime
from requisition.archive_service import ArchiveService
import logging

logger = logging.getLogger('pms.app')


class Command(BaseCommand):
    help = 'Archive completed requests and their documents'

    def add_arguments(self, parser):
        parser.add_argument(
            '--weeks',
            type=int,
            default=2,
            help='Number of weeks to look back for completed requests (default: 2)'
        )
        parser.add_argument(
            '--start',
            type=str,
            help='Start date for archive period (YYYY-MM-DD format)'
        )
        parser.add_argument(
            '--end',
            type=str,
            help='End date for archive period (YYYY-MM-DD format)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be archived without actually creating the archive'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== Request Archive Process Started ==='))

        # Determine time period
        if options['start'] and options['end']:
            try:
                period_start = timezone.make_aware(datetime.strptime(options['start'], '%Y-%m-%d'))
                period_end = timezone.make_aware(datetime.strptime(options['end'], '%Y-%m-%d'))
            except ValueError as e:
                self.stdout.write(self.style.ERROR(f'Invalid date format: {e}'))
                return
        else:
            period_end = timezone.now()
            period_start = period_end - timedelta(weeks=options['weeks'])

        self.stdout.write(f'Archive period: {period_start.date()} to {period_end.date()}')

        # Initialize archive service
        service = ArchiveService()

        # Check how many requests would be archived
        requests = service.get_completed_requests_in_period(period_start, period_end)
        request_count = len(list(requests))

        if request_count == 0:
            self.stdout.write(self.style.WARNING('No completed requests found in this period'))
            return

        self.stdout.write(f'Found {request_count} completed requests to archive')

        if options['dry_run']:
            self.stdout.write(self.style.WARNING('DRY RUN - No archive will be created'))
            for req in requests:
                self.stdout.write(f'  - {req.request_number}: {req.item} (completed: {req.updated_at})')
            return

        # Create archive
        try:
            archive = service.create_archive(period_start, period_end)

            if archive:
                self.stdout.write(self.style.SUCCESS('✓ Archive created successfully!'))
                self.stdout.write(f'  Archive ID: {archive.id}')
                self.stdout.write(f'  File: {archive.file_path}')
                self.stdout.write(f'  Size: {archive.file_size / 1024 / 1024:.2f} MB')
                self.stdout.write(f'  Requests archived: {archive.request_count}')
                self.stdout.write('')
                self.stdout.write(self.style.WARNING('⚠️  Note: Requests will be deleted from database only after archive is downloaded'))
            else:
                self.stdout.write(self.style.WARNING('No archive created (no requests in period)'))

        except Exception as e:
            logger.exception('Archive creation failed')
            self.stdout.write(self.style.ERROR(f'✗ Archive creation failed: {str(e)}'))
            raise

        self.stdout.write(self.style.SUCCESS('=== Archive Process Completed ==='))
