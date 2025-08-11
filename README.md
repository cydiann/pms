# Procurement Management System (PMS)

A comprehensive procurement management system for worksite operations, built with Django REST API backend and React Native frontend.

## 🏗️ Project Structure

```
pms/
├── pms-be/              # Django REST API Backend
├── PMSFrontend/         # React Native Frontend (New)
├── pms-fe/              # React Native Frontend (Old - deprecated)
├── PLAN.md              # Project roadmap and completed features
├── DEVELOPMENT_SETUP.md # Development environment setup guide
└── README.md            # This file
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 16+ for React Native development
- Android Studio / Xcode for mobile development
- Postman for API testing

### Backend Setup
```bash
cd pms-be
docker compose up --build
```

Backend will be available at:
- API: http://localhost:8000
- Admin Panel: http://localhost:8000/admin (admin/admin123)

### Frontend Setup
```bash
cd PMSFrontend
npm install
npm start
```

### API Testing
Import the Postman collection:
- File: `pms-be/PMS_API_Collection_Updated.postman_collection.json`
- Test with users: admin, ceo, manager, engineer, purchasing

## 👥 Test Users

| Username | Password | Role | Access Level |
|----------|----------|------|--------------|
| admin | admin123 | Superuser | Django admin |
| ceo | ceo123 | Administrator | Full system access |
| manager | manager123 | Supervisor | Team management |
| engineer | engineer123 | Employee | Create requests |
| purchasing | purchasing123 | Purchasing Team | Handle orders |

## 🔄 User Hierarchy
```
CEO (ceo)
├── Site Manager (manager) 
│   └── Team Leader (leader)
│       ├── Engineer (engineer)
│       └── Worker (worker)
└── Purchasing Manager (purchasing)
```

## ✨ Features Completed

### Phase 1: Foundation ✅
- TypeScript React Native setup
- Redux state management with persistence
- JWT authentication system
- Material Design UI with React Native Paper
- Role-based navigation

### Phase 2: Request Management ✅
- Complete CRUD operations for requests
- Advanced search and filtering
- Request status workflow
- Form validation and submission

### Phase 3: Approval Workflow ✅
- Supervisor team management
- Bulk approval operations
- Purchasing team workflow
- Admin password reset system
- Advanced notifications

### Phase 4: Admin Features ✅
- Simple admin dashboard
- User management interface
- Basic system statistics

## 🛠️ Tech Stack

### Backend
- Django 5.2 + Django REST Framework
- PostgreSQL database
- JWT authentication
- Docker containerization

### Frontend
- React Native 0.75
- TypeScript
- Redux Toolkit
- React Navigation 6
- React Native Paper
- Async Storage

## 📱 Development

### Start Development Environment
1. **Backend**: `cd pms-be && docker compose up`
2. **Frontend**: `cd PMSFrontend && npm start`
3. **Android**: `npm run android`
4. **iOS**: `npm run ios`

### Testing API
Use Postman collection with base URL `http://localhost:8000`

## 📋 Next Steps

- [ ] Complete React Native setup testing
- [ ] Implement offline support
- [ ] Add real-time notifications
- [ ] Enhanced UX improvements
- [ ] Production deployment

## 🔗 Important Files

- **PLAN.md**: Detailed project roadmap and progress
- **DEVELOPMENT_SETUP.md**: Complete setup instructions
- **pms-be/CLAUDE.md**: Backend architecture documentation

---

**Status**: Backend fully operational, Frontend migration in progress

**Last Updated**: August 2025