# Development Environment Setup Guide

## 🚀 Quick Start

### Step 1: Start the Backend
```bash
cd /home/cagatay/developer/pms/pms-be
docker-compose up --build
```

**What this does:**
- Starts PostgreSQL database on port 5432
- Builds and starts Django app on port 8000
- Automatically creates test data and users
- Shows logs for both database and Django

### Step 2: Verify Backend is Running
Open your browser and check:
- **API Root**: http://localhost:8000/api/
- **Admin Panel**: http://localhost:8000/admin/
  - Username: `admin`
  - Password: `admin123`

### Step 3: Import Postman Collection
1. Open Postman
2. Click **Import** 
3. Select file: `/home/cagatay/developer/pms/pms-be/PMS_API_Collection_Updated.postman_collection.json`
4. Collection will be imported with all endpoints ready to test

### Step 4: Test API with Postman
1. Go to **🔐 Authentication** folder
2. Run **"Login (Admin)"** request
3. JWT token will be automatically saved
4. Now you can test any other endpoint!

### Step 5: Start React Native Development
```bash
cd /home/cagatay/developer/pms/pms-fe
npm start
# or yarn start
```

## 👥 Test Users Available

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| `admin` | `admin123` | Superuser | Django admin access |
| `ceo` | `ceo123` | Administrator | Top-level admin |
| `manager` | `manager123` | Supervisor | Site manager |
| `leader` | `leader123` | Supervisor | Team leader |
| `engineer` | `engineer123` | Employee | Regular employee |
| `worker` | `worker123` | Employee | Regular employee |
| `purchasing` | `purchasing123` | Purchasing Team | Handles purchasing |

## 🏗️ User Hierarchy
```
CEO (ceo)
├── Site Manager (manager) 
│   └── Team Leader (leader)
│       ├── Engineer (engineer)
│       └── Worker (worker)
└── Purchasing Manager (purchasing)
```

## 🔧 Common Commands

### Backend Management
```bash
# View logs
docker-compose logs -f app

# Access database
docker-compose exec db psql -U pms_user -d pms_db

# Run migrations
docker-compose exec app python manage.py migrate

# Create superuser
docker-compose exec app python manage.py createsuperuser

# Stop services
docker-compose down

# Reset database (WARNING: Deletes all data)
docker-compose down -v
docker-compose up --build
```

### React Native Development
```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS 
npm run ios

# Clear cache
npm start -- --reset-cache
```

## 🌐 Network Configuration

### For Different Platforms:
- **iOS Simulator**: Use `http://localhost:8000`
- **Android Emulator**: Use `http://10.0.2.2:8000` (already configured)
- **Physical Device**: Use your computer's IP like `http://192.168.1.100:8000`

### Change API URL:
Edit `/home/cagatay/developer/pms/pms-fe/src/constants/api.ts`

## 🧪 Testing Workflow

### 1. Backend API Testing (Postman)
1. Start backend with Docker
2. Import Postman collection
3. Login with any test user
4. Test endpoints in this order:
   - Authentication (Login/Refresh)
   - Organization (Worksites/Divisions) 
   - Requests (CRUD operations)
   - Admin (Stats/User management)

### 2. Frontend Integration Testing
1. Start React Native app
2. Login with test users
3. Test role-based navigation:
   - **Employee**: Create requests, view own requests
   - **Supervisor**: Approve team requests
   - **Admin**: Manage users and system
   - **Purchasing**: Handle approved requests

### 3. End-to-End Testing
1. Create request as `engineer`
2. Approve as `leader` (supervisor)
3. Process as `purchasing`
4. View admin stats as `admin`

## 🐛 Troubleshooting

### Backend Issues
**Port 8000 already in use:**
```bash
# Kill process using port 8000
sudo lsof -t -i:8000 | xargs kill -9
# Or change port in docker-compose.yml
```

**Database connection failed:**
```bash
# Reset Docker volumes
docker-compose down -v
docker-compose up --build
```

**No test data:**
```bash
# The entrypoint.sh automatically creates test data
# If missing, restart containers:
docker-compose restart
```

### Frontend Issues
**Cannot connect to backend:**
1. Check if backend is running: http://localhost:8000/api/
2. For Android emulator, ensure using `http://10.0.2.2:8000`
3. For iOS simulator, ensure using `http://localhost:8000`

**Metro bundler issues:**
```bash
# Clear cache and restart
npm start -- --reset-cache
```

**Network request failed:**
- Check API_CONFIG.BASE_URL in `/src/constants/api.ts`
- Ensure your computer's firewall allows connections
- Try using your computer's IP address instead of localhost

## 📱 React Native Debugging

### Enable Network Debugging
1. In simulator/emulator: Shake device → Debug → Network Inspector
2. Or use Flipper for advanced debugging
3. Check Redux DevTools for state inspection

### Common Development Tasks
- **Add new API endpoint**: Update `src/services/` and `src/store/slices/`
- **Add new screen**: Create in `src/screens/` and update navigation
- **Test with different users**: Use test credentials above
- **Check permissions**: Verify role-based access in different user contexts

## 🎯 Next Steps

Once everything is running:
1. **Test core workflows** with different user roles
2. **Implement Phase 4 features** (offline support, enhanced UX)
3. **Add real-time features** as needed
4. **Deploy to staging environment** when ready

---

**Need Help?** 
- Check Django logs: `docker-compose logs -f app`
- Check React Native logs in Metro bundler
- Test API endpoints individually in Postman first
- Verify user permissions and roles in Django admin