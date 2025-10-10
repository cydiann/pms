# Railway Deployment Guide

## Prerequisites
- Railway account (https://railway.app)
- GitHub repository connected to Railway
- PostgreSQL database (Railway provides this)

## Monorepo Structure

This repository contains both frontend (`pms-fe`) and backend (`pms-be`) code.
The `railway.json` file is configured to deploy **only the backend** from the `pms-be` directory.

## Quick Deploy Steps

### 1. Create New Project on Railway
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose this repository (Railway will automatically detect `railway.json` in the root)
5. **IMPORTANT**: When prompted, select the `master` branch for deployment
6. Enable "Auto-Deploy" to automatically deploy on every push to master

### 2. Add PostgreSQL Database
1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create `DATABASE_URL` environment variable

### 3. Configure Environment Variables

Go to your service settings and add these environment variables:

```bash
# Django Settings
DEBUG=False
SECRET_KEY=<generate-a-secure-random-key>
ALLOWED_HOSTS=<your-app>.railway.app

# Database
# DATABASE_URL is automatically provided by Railway PostgreSQL

# JWT Configuration
JWT_ACCESS_TOKEN_LIFETIME_HOURS=1
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# CORS Settings (update with your frontend URL)
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
CORS_ALLOW_ALL_ORIGINS=False

# MinIO/S3 Storage (required for document uploads)
MINIO_ENDPOINT=your-minio-endpoint.com
MINIO_PUBLIC_ENDPOINT=https://your-minio-public-endpoint.com
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_USE_SSL=True
MINIO_BUCKET_NAME=pms-documents

# Security (Production)
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# Pagination
PAGINATION_PAGE_SIZE=20

# Logging
LOG_LEVEL=INFO

# Testing (disable on production)
RUN_TESTS_ON_STARTUP=False
```

### 4. Generate Secret Keys

Generate secure secret keys:
```bash
# Django SECRET_KEY
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

### 5. Deploy

Railway deployment process:
1. Reads `railway.json` from repository root
2. Builds using Dockerfile at `pms-be/Dockerfile`
3. Only watches/triggers on changes to `pms-be/**` files (frontend changes won't trigger redeploy)
4. Runs `entrypoint.sh` from `pms-be` directory which:
   - Waits for database connection
   - Runs migrations
   - Creates initial data (admin user, groups, test users)
   - Starts Gunicorn server (production) or Django dev server (if DEBUG=True)

**Note**: The `railway.json` file is located in the repository root and points to the backend directory.

### 6. Access Your Application

Once deployed, Railway will provide a public URL:
```
https://<your-app>.railway.app
```

**Default Admin Credentials** (created by entrypoint.sh):
- Username: `admin`
- Password: `admin123`

**⚠️ IMPORTANT**: Change the admin password immediately after first login!

### 7. Test Users (Created Automatically)

The system creates a test hierarchy on first deployment:

```
CEO (ceo/ceo123) - Administrator
├── Site Manager (manager/manager123) - Supervisor
│   └── Team Leader (leader/leader123) - Supervisor
│       ├── Engineer (engineer/engineer123) - Employee
│       └── Worker (worker/worker123) - Employee
└── Purchasing Manager (purchasing/purchasing123) - Purchasing Team
```

## Common Issues

### Database Connection Issues
- Ensure PostgreSQL service is running
- Check `DATABASE_URL` environment variable is set
- Verify network connectivity between services

### Static Files Not Loading
- Railway serves static files through Whitenoise (configured in settings.py)
- Run `python manage.py collectstatic` if needed

### MinIO/S3 Storage Issues
- Verify MinIO credentials are correct
- Ensure bucket exists and is accessible
- Check CORS settings on MinIO/S3 bucket

### Migrations Not Running
- Check logs: `railway logs`
- Manually run: `railway run python manage.py migrate`

## Monitoring

View logs in real-time:
```bash
railway logs
```

View specific service logs in Railway dashboard.

## Scaling

To adjust Gunicorn workers, set environment variable:
```bash
GUNICORN_WORKERS=4  # Default is 2
GUNICORN_TIMEOUT=120  # Default is 60
```

Workers formula: `(2 × CPU cores) + 1`

## Database Backups

Railway automatically backs up PostgreSQL databases. You can also:
1. Use Railway's built-in backup feature
2. Set up automated backups via Railway CLI
3. Export manually via pgAdmin or psql

## Updating Deployment

### Automatic Deployment (Recommended)
Railway automatically redeploys when you push to the `master` branch:
```bash
git add .
git commit -m "Your commit message"
git push origin master
```

Railway will:
1. Detect the push to `master`
2. Build using Dockerfile
3. Run entrypoint.sh
4. Deploy the new version

### Manual Deployment
Or manually redeploy from Railway dashboard:
1. Go to your service
2. Click "Deployments" tab
3. Click "Deploy" button

### Verify Deployment Branch
To ensure Railway is listening to `master`:
1. Go to Service Settings
2. Check **Source** section
3. Verify **Branch** is set to `master`
4. Ensure **Auto-Deploy** is enabled

## Production Checklist

- [ ] Change default admin password
- [ ] Set strong `SECRET_KEY`
- [ ] Configure proper `ALLOWED_HOSTS`
- [ ] Set `DEBUG=False`
- [ ] Configure CORS for your frontend domain
- [ ] Set up MinIO/S3 storage
- [ ] Enable SSL settings (`SECURE_SSL_REDIRECT=True`)
- [ ] Set `RUN_TESTS_ON_STARTUP=False`
- [ ] Configure email backend (if using password reset)
- [ ] Review and delete test users if not needed
- [ ] Set up monitoring/alerting
- [ ] Configure database backups
- [ ] Test the entire approval workflow

## Support

For Railway-specific issues: https://railway.app/help
For application issues: Check the main README.md