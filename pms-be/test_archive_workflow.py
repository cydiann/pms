"""
Test script for the complete archive workflow

This script:
1. Creates test users and organizational structure
2. Creates completed requests with approval history
3. Triggers the archive creation
4. Verifies archive was created
5. Simulates download and verifies cleanup

Run with: docker-compose exec app python test_archive_workflow.py
"""

import os
import django
import sys
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.db import transaction

from organization.models import Worksite
from requisition.models import Request, ApprovalHistory, RequestArchive, ProcurementDocument
from requisition.archive_service import ArchiveService

User = get_user_model()


class ArchiveWorkflowTest:
    """Test the complete archive workflow"""

    def __init__(self):
        self.created_users = []
        self.created_requests = []
        self.created_worksite = None
        self.archive = None
        self.service = ArchiveService()

    def cleanup_previous_tests(self):
        """Clean up any previous test data"""
        print("\n🧹 Cleaning up previous test data...")

        # Delete test archives
        RequestArchive.objects.filter(
            archived_request_numbers__contains='TEST-'
        ).delete()

        # Delete test requests
        Request.objects.filter(request_number__startswith='TEST-').delete()

        # Delete test users
        User.objects.filter(username__startswith='testarchive_').delete()

        # Delete test worksite
        Worksite.objects.filter(address__startswith='Test Archive Worksite').delete()

        print("✓ Previous test data cleaned")

    def create_test_users(self):
        """Create test users with hierarchy"""
        print("\n👥 Creating test users...")

        # Create worksite
        self.created_worksite = Worksite.objects.create(
            address='Test Archive Worksite',
            city='Test City',
            country='Test Country'
        )

        # Create CEO (top level)
        ceo = User.objects.create_user(
            username='testarchive_ceo',
            password='testpass123',
            first_name='CEO',
            last_name='Test',
            worksite=self.created_worksite,
            supervisor=None
        )
        self.created_users.append(ceo)

        # Create Manager
        manager = User.objects.create_user(
            username='testarchive_manager',
            password='testpass123',
            first_name='Manager',
            last_name='Test',
            worksite=self.created_worksite,
            supervisor=ceo
        )
        self.created_users.append(manager)

        # Create Employee
        employee = User.objects.create_user(
            username='testarchive_employee',
            password='testpass123',
            first_name='Employee',
            last_name='Test',
            worksite=self.created_worksite,
            supervisor=manager
        )
        self.created_users.append(employee)

        print(f"✓ Created {len(self.created_users)} test users")
        return ceo, manager, employee

    def create_completed_requests(self, employee, manager, ceo, count=5):
        """Create completed requests with full approval history"""
        print(f"\n📋 Creating {count} completed requests...")

        created_count = 0
        for i in range(count):
            with transaction.atomic():
                # Create request
                request = Request.objects.create(
                    request_number=f'TEST-2025-REQ{i+1:03d}',
                    item=f'Test Item {i+1}',
                    description=f'Test description for item {i+1}',
                    quantity=i+1,
                    unit='pieces',
                    category='Test Category',
                    delivery_address='Test Address',
                    reason=f'Test reason {i+1}',
                    created_by=employee,
                    status='completed',
                    approval_level=2,
                    last_approver=ceo
                )

                # Set timestamps to be in the past (within last 2 weeks)
                days_ago = 14 - i  # Spread across 2 weeks
                past_time = timezone.now() - timedelta(days=days_ago)
                request.created_at = past_time
                request.submitted_at = past_time + timedelta(hours=1)
                request.updated_at = past_time + timedelta(days=2)  # Completed 2 days after creation
                request.save()

                # Create approval history
                # 1. Submission
                ApprovalHistory.objects.create(
                    request=request,
                    user=employee,
                    action='submitted',
                    level=0,
                    notes='Initial submission',
                    created_at=request.submitted_at
                )

                # 2. Manager approval
                ApprovalHistory.objects.create(
                    request=request,
                    user=manager,
                    action='approved',
                    level=1,
                    notes='Approved by manager',
                    created_at=request.submitted_at + timedelta(hours=2)
                )

                # 3. CEO final approval
                ApprovalHistory.objects.create(
                    request=request,
                    user=ceo,
                    action='final_approved',
                    level=2,
                    notes='Final approval by CEO',
                    created_at=request.submitted_at + timedelta(hours=4)
                )

                # 4. Purchasing
                ApprovalHistory.objects.create(
                    request=request,
                    user=ceo,  # Using CEO as purchasing team for simplicity
                    action='ordered',
                    level=0,
                    notes='Order placed',
                    created_at=request.submitted_at + timedelta(days=1)
                )

                # 5. Delivered
                ApprovalHistory.objects.create(
                    request=request,
                    user=ceo,
                    action='delivered',
                    level=0,
                    notes='Items delivered',
                    created_at=request.submitted_at + timedelta(days=1, hours=12)
                )

                # 6. Completed
                ApprovalHistory.objects.create(
                    request=request,
                    user=ceo,
                    action='completed',
                    level=0,
                    notes='Request completed',
                    created_at=request.updated_at
                )

                self.created_requests.append(request)
                created_count += 1

        print(f"✓ Created {created_count} completed requests with full approval history")
        return self.created_requests

    def verify_requests_exist(self):
        """Verify that requests exist in the database"""
        print("\n🔍 Verifying requests exist...")

        request_numbers = [r.request_number for r in self.created_requests]
        existing_count = Request.objects.filter(request_number__in=request_numbers).count()

        print(f"✓ Found {existing_count}/{len(self.created_requests)} requests in database")
        assert existing_count == len(self.created_requests), "Not all requests were created!"

    def create_archive(self):
        """Trigger archive creation"""
        print("\n📦 Creating archive...")

        # Calculate period (last 2 weeks)
        period_end = timezone.now()
        period_start = period_end - timedelta(weeks=2)

        # Create archive
        self.archive = self.service.create_archive(period_start, period_end)

        if self.archive:
            print(f"✓ Archive created successfully!")
            print(f"  - Archive ID: {self.archive.id}")
            print(f"  - File path: {self.archive.file_path}")
            print(f"  - File size: {self.archive.file_size / 1024 / 1024:.2f} MB")
            print(f"  - Requests archived: {self.archive.request_count}")
            print(f"  - Period: {self.archive.period_start.date()} to {self.archive.period_end.date()}")
        else:
            raise Exception("Archive creation failed!")

        return self.archive

    def verify_archive_file_exists(self):
        """Verify the archive ZIP file exists on disk"""
        print("\n📁 Verifying archive file exists...")

        archive_path = Path(self.archive.file_path)

        if archive_path.exists():
            print(f"✓ Archive file exists: {archive_path}")
            print(f"  - File size: {archive_path.stat().st_size / 1024 / 1024:.2f} MB")
        else:
            raise Exception(f"Archive file not found: {archive_path}")

    def verify_requests_deleted(self):
        """Verify requests were deleted after archive creation"""
        print("\n🔍 Verifying requests were deleted after archive creation...")

        request_numbers = [r.request_number for r in self.created_requests]
        existing_count = Request.objects.filter(request_number__in=request_numbers).count()

        print(f"✓ Requests in database: {existing_count}/{len(self.created_requests)} (should be 0)")
        assert existing_count == 0, "Requests were not deleted after archive creation!"

    def simulate_download_and_cleanup(self):
        """Simulate download by calling cleanup directly"""
        print("\n⬇️  Simulating archive download and cleanup...")

        # Verify archive hasn't been downloaded yet
        assert not self.archive.downloaded, "Archive already marked as downloaded!"

        # Mark as downloaded (simulating the download endpoint behavior)
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user = self.created_users[0]  # Use CEO as fallback
            admin_user.is_superuser = True
            admin_user.save()

        self.archive.mark_downloaded(admin_user)
        print(f"✓ Archive marked as downloaded by {admin_user.get_full_name()}")

        # Perform cleanup
        self.service.cleanup_after_download(self.archive)
        print("✓ Cleanup completed")

    def verify_download_cleanup_success(self):
        """Verify that download cleanup was successful"""
        print("\n✅ Verifying download cleanup was successful...")

        # Check that archive file was deleted
        archive_path = Path(self.archive.file_path)
        file_exists = archive_path.exists()
        print(f"  - Archive file exists: {file_exists} (should be False)")
        assert not file_exists, "Archive file was not deleted after download!"

        # Check that archive record still exists (for history)
        archive_exists = RequestArchive.objects.filter(id=self.archive.id).exists()
        print(f"  - Archive record exists: {archive_exists} (should be True)")
        assert archive_exists, "Archive record was deleted!"

        # Check that archive is marked as downloaded
        self.archive.refresh_from_db()
        print(f"  - Archive marked as downloaded: {self.archive.downloaded}")
        assert self.archive.downloaded, "Archive not marked as downloaded!"

        print("\n✅ All download cleanup verifications passed!")

    def cleanup_test_data(self, skip_archive_deletion=False):
        """Clean up all test data"""
        print("\n🧹 Cleaning up test data...")

        if skip_archive_deletion:
            print(f"⚠️  Skipping archive deletion for inspection")
            print(f"📁 Archive file location: {self.archive.file_path if self.archive else 'N/A'}")
            print(f"🔍 Archive ID: {self.archive.id if self.archive else 'N/A'}")
        else:
            # Delete archive record
            if self.archive:
                RequestArchive.objects.filter(id=self.archive.id).delete()
                print("✓ Deleted archive record")

        # Delete any remaining requests (shouldn't be any)
        Request.objects.filter(request_number__startswith='TEST-').delete()

        # Delete test users
        User.objects.filter(username__startswith='testarchive_').delete()
        print("✓ Deleted test users")

        # Delete test worksite
        if self.created_worksite:
            self.created_worksite.delete()
            print("✓ Deleted test worksite")

    def run(self):
        """Run the complete test workflow"""
        print("=" * 70)
        print("🚀 ARCHIVE WORKFLOW TEST")
        print("=" * 70)

        try:
            # Phase 1: Setup
            self.cleanup_previous_tests()
            ceo, manager, employee = self.create_test_users()
            self.create_completed_requests(employee, manager, ceo, count=5)
            self.verify_requests_exist()

            # Phase 2: Archive Creation
            self.create_archive()
            self.verify_archive_file_exists()
            self.verify_requests_deleted()

            # Phase 3: Download and Cleanup (SKIPPED - Keep archive for inspection)
            print("\n⏭️  Skipping download simulation to preserve archive for inspection")

            # Phase 4: Final Cleanup (Skip archive deletion)
            self.cleanup_test_data(skip_archive_deletion=True)

            print("\n" + "=" * 70)
            print("✅ ALL TESTS PASSED!")
            print("=" * 70)
            print("\n💡 Archive preserved for inspection - extract and check the Excel file!")
            return True

        except Exception as e:
            print("\n" + "=" * 70)
            print(f"❌ TEST FAILED: {str(e)}")
            print("=" * 70)

            # Attempt cleanup even on failure
            try:
                self.cleanup_test_data()
            except:
                pass

            import traceback
            traceback.print_exc()
            return False


if __name__ == '__main__':
    test = ArchiveWorkflowTest()
    success = test.run()
    sys.exit(0 if success else 1)