# MinIO Deployment Configuration Guide

This guide explains how to configure MinIO endpoints for different deployment scenarios.

## Problem

MinIO file uploads were failing with `net::ERR_NAME_NOT_RESOLVED` because the frontend browser couldn't resolve the internal Docker hostname `minio:9000`. 

## Solution

We now support separate endpoints for **internal server communication** and **external browser access**.

## Environment Variables

### `MINIO_ENDPOINT`
- **Purpose**: Internal server-to-server communication
- **Used by**: Django backend, MinIO client operations
- **Examples**: `minio:9000`, `internal-minio.company.com:9000`

### `MINIO_PUBLIC_ENDPOINT`
- **Purpose**: External browser access for file uploads/downloads  
- **Used by**: Frontend presigned URLs
- **Examples**: `localhost:9000`, `minio.company.com`, `storage.company.com:9000`

## Deployment Scenarios

### 1. Local Development (Docker Compose)

```env
# .env
MINIO_ENDPOINT=minio:9000              # Internal Docker network
MINIO_PUBLIC_ENDPOINT=localhost:9000   # Browser access via localhost
```

**Setup**: MinIO port 9000 is mapped to host `localhost:9000`

### 2. Production with External MinIO Service

```env
# .env
MINIO_ENDPOINT=minio-internal.company.com:9000    # Internal network
MINIO_PUBLIC_ENDPOINT=minio.company.com           # Public domain (port 80/443)
```

**Setup**: MinIO behind load balancer with public domain

### 3. AWS S3 Compatible (External Service)

```env
# .env  
MINIO_ENDPOINT=s3.amazonaws.com                    # AWS S3 endpoint
MINIO_PUBLIC_ENDPOINT=s3.amazonaws.com             # Same for both
MINIO_USE_SSL=True                                 # Use HTTPS
```

### 4. Cloud Deployment with Internal Load Balancer

```env
# .env
MINIO_ENDPOINT=10.0.0.100:9000                     # Internal IP
MINIO_PUBLIC_ENDPOINT=storage-api.company.com      # Public API gateway
```

## How It Works

1. **Backend Operations** (create bucket, stat objects, etc.)
   - Uses `MINIO_ENDPOINT` for internal communication
   - Fast, secure internal network access

2. **Presigned URLs** (file uploads/downloads from browser)
   - Generated using `MINIO_ENDPOINT` 
   - **Automatically replaced** with `MINIO_PUBLIC_ENDPOINT`
   - Browser can access the public endpoint

## Code Implementation

### Backend (`requisition/storage.py`)

```python
def get_presigned_upload_url(self, object_name, expiry_seconds=None):
    # Generate URL with internal endpoint
    url = self.client.presigned_put_object(...)
    
    # Replace with public endpoint for browser access
    if hasattr(settings, 'MINIO_PUBLIC_ENDPOINT') and settings.MINIO_PUBLIC_ENDPOINT:
        url = url.replace(settings.MINIO_ENDPOINT, settings.MINIO_PUBLIC_ENDPOINT)
    
    return url
```

### Settings (`backend/settings.py`)

```python
MINIO_ENDPOINT = config('MINIO_ENDPOINT', default='minio:9000')
MINIO_PUBLIC_ENDPOINT = config('MINIO_PUBLIC_ENDPOINT', default='localhost:9000')
```

## Troubleshooting

### File Upload Fails with `ERR_NAME_NOT_RESOLVED`
- **Cause**: `MINIO_PUBLIC_ENDPOINT` is not set or incorrect
- **Solution**: Set `MINIO_PUBLIC_ENDPOINT` to an endpoint accessible by browsers

### File Upload Fails with Connection Refused  
- **Cause**: MinIO service not accessible on public endpoint
- **Solution**: Check MinIO service is running and ports are exposed

### Backend Can't Connect to MinIO
- **Cause**: `MINIO_ENDPOINT` is incorrect for internal communication
- **Solution**: Use internal network hostname/IP for `MINIO_ENDPOINT`

## Testing Your Configuration

### 1. Test Backend Connection
```bash
# Check if backend can connect to MinIO
docker-compose exec app python manage.py shell
>>> from requisition.storage import storage
>>> storage.client.bucket_exists('pms-files')
True
```

### 2. Test Presigned URLs
```bash
# Get a presigned URL
curl -H "Authorization: Bearer <JWT_TOKEN>" \
     http://localhost:8000/api/requests/documents/
```

Check that the returned `upload_url` uses `MINIO_PUBLIC_ENDPOINT`.

### 3. Test File Upload from Browser
1. Open browser developer tools
2. Attempt file upload
3. Check Network tab - should see PUT request to `MINIO_PUBLIC_ENDPOINT`

## Migration from Old Setup

If you have an existing deployment:

1. **Add new environment variable**:
   ```bash
   MINIO_PUBLIC_ENDPOINT=your-public-endpoint
   ```

2. **Restart the application**:
   ```bash
   docker-compose restart app
   ```

3. **No database changes needed** - this is purely configuration

## Security Considerations

- **Internal Endpoint**: Keep secure, not exposed to public internet
- **Public Endpoint**: Can be public, access controlled by presigned URL expiry
- **Credentials**: Never expose MinIO credentials in frontend code
- **HTTPS**: Use `MINIO_USE_SSL=True` for production deployments

## Future Enhancements

- Support for multiple storage backends
- CDN integration for faster file access  
- File upload progress tracking
- Automatic retry for failed uploads