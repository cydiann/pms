from minio import Minio
from minio.error import S3Error
from django.conf import settings
from datetime import timedelta
import uuid
import logging

logger = logging.getLogger(__name__)


class MinIOStorage:
    """MinIO storage backend for file uploads"""
    
    def __init__(self):
        # Use internal endpoint for server operations
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_USE_SSL
        )
        
        # Store public endpoint for lazy initialization
        self.public_endpoint = getattr(settings, 'MINIO_PUBLIC_ENDPOINT', settings.MINIO_ENDPOINT)
        self._public_client = None  # Lazy initialization
        
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self._ensure_bucket_exists()
    
    @property  
    def public_client(self):
        """Lazily create public client only when needed for URL generation"""
        if self._public_client is None:
            logger.info(f"Creating public client for endpoint: {self.public_endpoint}")
            # Create client and bypass region lookup completely
            self._public_client = Minio(
                self.public_endpoint,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_USE_SSL
            )
            # Set region directly to avoid any connection attempts
            self._public_client._region = "us-east-1"
            # Prevent region lookup by setting the bucket_location directly
            self._public_client._get_region = lambda bucket_name: "us-east-1"
        return self._public_client
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist - always use internal client for this"""
        try:
            # Always use internal client for bucket operations
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info(f"Created MinIO bucket: {self.bucket_name}")
                
                # Set bucket policy to allow presigned URL uploads
                self._set_bucket_policy()
            else:
                logger.info(f"MinIO bucket already exists: {self.bucket_name}")
        except S3Error as e:
            logger.error(f"Error ensuring bucket exists: {e}")
            raise
    
    def _set_bucket_policy(self):
        """Set bucket policy to allow presigned URL operations"""
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": [
                        "s3:GetObject",
                        "s3:PutObject"
                    ],
                    "Resource": f"arn:aws:s3:::{self.bucket_name}/*"
                }
            ]
        }
        
        try:
            import json
            self.client.set_bucket_policy(self.bucket_name, json.dumps(policy))
            logger.info(f"Set bucket policy for: {self.bucket_name}")
        except S3Error as e:
            logger.warning(f"Could not set bucket policy: {e}. Uploads may still work with proper credentials.")
        except Exception as e:
            logger.warning(f"Error setting bucket policy: {e}")
    
    def generate_object_name(self, request_number, document_type, file_name):
        """Generate unique object name for storage"""
        file_extension = file_name.split('.')[-1] if '.' in file_name else ''
        unique_id = str(uuid.uuid4())[:8]
        
        # Structure: requests/{request_number}/{document_type}/{unique_id}_{file_name}
        object_name = f"requests/{request_number}/{document_type}/{unique_id}_{file_name}"
        return object_name
    
    def get_presigned_upload_url(self, object_name, expiry_seconds=None):
        """Generate presigned URL for file upload using public endpoint"""
        if expiry_seconds is None:
            expiry_seconds = settings.MINIO_PRESIGNED_URL_EXPIRY
        
        try:
            logger.info(f"Generating presigned upload URL for object: {object_name}")
            logger.info(f"Using bucket: {self.bucket_name}")
            logger.info(f"Expiry seconds: {expiry_seconds}")
            logger.info(f"Public endpoint: {self.public_endpoint}")
            
            # Use public client directly to generate URL with correct hostname in signature
            url = self.public_client.presigned_put_object(
                self.bucket_name,
                object_name,
                expires=timedelta(seconds=expiry_seconds)
            )
            
            logger.info(f"Generated presigned upload URL: {url}")
            return url
            
        except S3Error as e:
            logger.error(f"Error generating upload URL: {e}")
            raise
    
    def get_presigned_download_url(self, object_name, expiry_seconds=None):
        """Generate presigned URL for file download using public endpoint"""
        if expiry_seconds is None:
            expiry_seconds = settings.MINIO_PRESIGNED_URL_EXPIRY
        
        try:
            logger.info(f"Generating presigned download URL for object: {object_name}")
            logger.info(f"Using public endpoint: {self.public_client._base_url}")
            
            # Use public client to generate URL with correct hostname in signature
            url = self.public_client.presigned_get_object(
                self.bucket_name,
                object_name,
                expires=timedelta(seconds=expiry_seconds)
            )
            
            logger.info(f"Generated presigned download URL: {url}")
            return url
            
        except S3Error as e:
            logger.error(f"Error generating download URL: {e}")
            raise
    
    def delete_object(self, object_name):
        """Delete object from storage"""
        try:
            self.client.remove_object(self.bucket_name, object_name)
            logger.info(f"Deleted object: {object_name}")
            return True
        except S3Error as e:
            logger.error(f"Error deleting object: {e}")
            return False
    
    def object_exists(self, object_name):
        """Check if object exists in storage"""
        try:
            self.client.stat_object(self.bucket_name, object_name)
            return True
        except S3Error:
            return False
    
    def get_object_info(self, object_name):
        """Get object metadata"""
        try:
            stat = self.client.stat_object(self.bucket_name, object_name)
            return {
                'size': stat.size,
                'etag': stat.etag,
                'content_type': stat.content_type,
                'last_modified': stat.last_modified
            }
        except S3Error as e:
            logger.error(f"Error getting object info: {e}")
            return None


# Lazy initialization - only create storage when needed
storage = None

def get_storage():
    """Get MinIO storage instance with lazy initialization and error handling"""
    global storage
    if storage is None:
        try:
            from django.conf import settings
            # Check if MinIO is enabled and configured
            if (hasattr(settings, 'MINIO_ENDPOINT') and 
                settings.MINIO_ENDPOINT and 
                settings.MINIO_ENDPOINT.strip()):
                storage = MinIOStorage()
            else:
                logger.warning("MinIO storage is not configured. File uploads will be disabled.")
                storage = None
        except Exception as e:
            logger.error(f"Failed to initialize MinIO storage: {e}")
            storage = None
    return storage