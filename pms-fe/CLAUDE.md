# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native cross-platform application for a Project Management System (PMS) frontend. It uses TypeScript, React Navigation for routing, React Query for data fetching, and React Hook Form for form management.

### Deployment Strategy

- **Primary target**: Mobile applications (iOS/Android) for regular users (Employees, Supervisors)
- **Admin panel**: Desktop application (Windows .exe) for administrators
- **Development approach**: Initially developed for web for easier testing, then ported to mobile platforms
- The web version serves as a development/testing platform but mobile is the primary deployment target for end users

## Common Development Commands

### Installation & Setup
```bash
npm install              # Install dependencies
```

### Running the Application
```bash
npm start               # Start Metro bundler for React Native
npm run android         # Run on Android emulator/device
npm run ios            # Run on iOS simulator/device (requires macOS)
npm run web            # Start webpack dev server for web (port 3000)
```

### Building
```bash
npm run build:web      # Build production web bundle to ./dist
```

### Code Quality
```bash
npm run lint           # Run ESLint
npm test              # Run Jest tests
```

## Git Workflow - Checkpoint Commits

This project uses a checkpoint commit system for local development. This allows frequent saves of work progress locally while maintaining clean commit history on the remote repository.

### Checkpoint Commit Convention

**Flag System:** Use `[CP]` prefix for checkpoint commits that will be squashed before pushing.

### Workflow Commands

#### During Development (Creating Checkpoints)
```bash
# Make frequent checkpoint commits
git add .
git commit -m "[CP] Add user authentication logic"
git commit -m "[CP] Fix validation errors"
git commit -m "[CP] Update UI components"
```

#### Before Pushing to Remote
```bash
# Option 1: Interactive Rebase (recommended for selective squashing)
git log --oneline -10          # Review recent commits
git rebase -i HEAD~N            # N = number of commits to combine
# In the editor, mark commits to squash with 's' instead of 'pick'
# Edit the final commit message to remove [CP] prefix

# Option 2: Soft Reset (for combining ALL commits since last push)
git log origin/master..HEAD --oneline  # Review commits to be squashed
git reset --soft origin/master         # Keep all changes staged
git commit -m "feat: Implement complete authentication flow"
git push origin master
```

#### Helper Commands
```bash
# View only checkpoint commits
git log --oneline --grep="^\[CP\]"

# Count checkpoint commits since last push
git log origin/master..HEAD --oneline --grep="^\[CP\]" | wc -l

# Create alias for checkpoint commit (add to ~/.gitconfig)
git config --global alias.cp '!git add -A && git commit -m "[CP] $1" && :'
# Usage: git cp "Work in progress"
```

### Best Practices

1. **Use Checkpoints For:**
   - Work-in-progress saves
   - Experimental changes
   - Before risky refactoring
   - End-of-day commits
   - Before switching context

2. **Final Commit Messages Should:**
   - Follow conventional commits format (feat:, fix:, docs:, etc.)
   - Describe the complete change, not individual steps
   - Include issue/ticket numbers if applicable
   - Never contain [CP] prefix

3. **Example Workflow:**
```bash
# Day 1: Start feature
git cp "Initial API setup"
git cp "Add request types"
git cp "Basic error handling"

# Day 2: Continue work
git cp "Add validation"
git cp "Fix edge cases"
git cp "Add tests"

# Ready to push: Combine all 6 commits
git rebase -i HEAD~6
# Squash all into one with message:
# "feat: Add purchase request API with validation and tests"
git push origin master
```

4. **Emergency Push (keeping checkpoints):**
   If you need to push without squashing (e.g., for backup):
```bash
git push origin master:backup/feature-checkpoints
# Later, clean up and force push to master
git rebase -i HEAD~N
git push origin master --force-with-lease
```

### Important Notes

- **NEVER** push [CP] commits to master/main branch
- **ALWAYS** review commits before pushing: `git log origin/master..HEAD`
- Use `--force-with-lease` instead of `--force` when rewriting history
- Consider creating a separate branch for experimental work with many checkpoints

## Architecture Overview

### Core Application Structure

The app follows a role-based authentication pattern with three main user types: Admin, Supervisor, and Employee. Each role has different navigation stacks and permissions.

**Entry Flow:**
1. `index.js` (mobile) / `index.web.js` (web) → Entry points
2. `src/App.tsx` → Root component with AuthProvider
3. `src/navigation/AppNavigator.tsx` → Main navigation orchestrator
4. `src/navigation/SimpleTabNavigator.tsx` → Role-based tab navigation

### State Management

**Authentication State (`src/store/AuthContext.tsx`):**
- Global auth state using React Context + useReducer pattern
- Handles login/logout, token management, and auth persistence
- Auto-refresh tokens via axios interceptors

**Tab State (`src/store/TabContext.tsx`):**
- Manages active tab state for navigation
- Used for programmatic tab switching

### API Layer

**API Client (`src/services/apiClient.ts`):**
- Centralized axios instance with interceptors
- Automatic token injection and refresh handling
- Base URL switches between development (localhost:8000) and production (Railway deployment)

**Service Layer (`src/services/`):**
- `authService.ts` - Authentication and user management
- `requestService.ts` - Purchase request CRUD operations
- `organizationService.ts` - Worksite and division management
- `dashboardService.ts` - Statistics and overview data
- `documentService.ts` - File upload/download handling
- `userService.ts` - User profile and permissions

### Navigation Architecture

**Stack Structure:**
- `AuthStack` - Login flow (unauthenticated users)
- `MainTabNavigator` - Base tab navigator
- `AdminTabNavigator` - Admin-specific tabs
- `SupervisorTabNavigator` - Supervisor-specific tabs
- `EmployeeTabNavigator` - Employee-specific tabs

Each role has access to different screens based on permissions checked at runtime.

### Cross-Platform Considerations

**Platform Utils (`src/utils/platformUtils.ts`):**
- Detects current platform (web/mobile)
- Provides platform-specific implementations

**Storage (`src/utils/storage.ts`):**
- Abstraction over AsyncStorage (mobile) and localStorage (web)
- Unified API for persistent storage

**Web-Specific Configuration:**
- `webpack.config.js` - Webpack setup for web build
- Aliases React Native modules to react-native-web
- Handles font and image assets

### Type System

All API responses and domain models are strongly typed in `src/types/`:
- `auth.ts` - Authentication types
- `requests.ts` - Purchase request models
- `organization.ts` - Worksite/division types
- `users.ts` - User and permission types
- `api.ts` - Generic API response types

### Internationalization

The app uses i18next for multi-language support:
- `src/locales/i18n.ts` - i18n configuration
- Language files in `src/locales/[lang]/`
- `LanguageSwitcher` component for runtime language switching

## API Integration

The frontend connects to a Django backend API. Key endpoints are defined in `src/constants/api.ts`.

**Environment-based API URL:**
- Development: `http://localhost:8000`
- Production: `https://pms-backend-production-20b3.up.railway.app`

## Testing Approach

The project uses Jest with React Native preset. Test files follow the `__tests__` directory convention or `*.test.{ts,tsx}` naming pattern.

## Key Dependencies

- **React Navigation**: Complete navigation solution with stack and tab navigators
- **React Query (@tanstack/react-query)**: Server state management and caching
- **React Hook Form**: Performant form handling with validation
- **Axios**: HTTP client with interceptor support
- **React Native Elements**: UI component library
- **React Native Vector Icons**: Icon library support
- **i18next**: Internationalization framework