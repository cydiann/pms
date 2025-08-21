# User Management Debugging Guide

## Issues Fixed and Debug Features Added

### 1. Navigation Fix
- **Issue**: `SimpleTabNavigator` was using old `AllUsersScreen` instead of new `UserManagementScreen`
- **Fix**: Updated import and component reference in `SimpleTabNavigator.tsx`

### 2. Type Compatibility Fix
- **Issue**: `userService` utility methods expected `ExtendedUser` but received `UserListItem`
- **Fix**: Updated method signatures to accept both types: `ExtendedUser | UserListItem`

### 3. Comprehensive Debug Logging Added

#### UserManagementScreen Debug Points:
- Component render tracking
- useEffect mount tracking
- User loading process with detailed API response
- Current user loading with error details
- User press events
- Modal visibility state changes

#### UserDetailModal Debug Points:
- Component render with props
- Modal visibility changes
- User data loading process
- API response details
- Form state management

#### UserService Debug Points:
- API request URLs and parameters
- Response data structure
- Error details with full stack traces

## How to Test and Debug

### 1. Start the Development Server
```bash
cd /Users/cagatayaydin/Developer/pms/pms-fe
npm start
```

### 2. Open Browser Developer Tools
- Open Chrome DevTools (F12)
- Go to Console tab
- Look for logs starting with:
  - `UserManagementScreen:`
  - `UserDetailModal:`
  - `UserService:`

### 3. Test Steps

#### Step 1: Initial Load
1. Navigate to the admin panel
2. Click on "Users" tab
3. **Expected Console Output**:
   ```
   UserManagementScreen: Component rendered
   UserManagementScreen: useEffect triggered - mounting component
   UserManagementScreen: Loading current user...
   UserService: getCurrentUser called
   UserService: Making request to URL: /auth/users/me/
   UserManagementScreen: Loading users...
   UserService: getUsers called with params: {...}
   UserService: Making request to URL: /auth/users/...
   ```

#### Step 2: Test User List Loading
- **If successful**: You should see user cards displayed
- **If failed**: Check console for error messages with detailed API response

#### Step 3: Test User Detail Modal
1. Click on any user in the list
2. **Expected Console Output**:
   ```
   UserManagementScreen: User pressed: {user data}
   UserManagementScreen: Modal should be visible now
   UserDetailModal: Rendered with props - visible: true, userId: X
   UserDetailModal: Effect triggered - visible: true userId: X
   UserDetailModal: Loading user with ID: X
   ```

### 4. Common Issues to Look For

#### Backend Connection Issues
- Look for network errors in console
- Check if API endpoints are returning 404/500 errors
- Verify authentication tokens are valid

#### Data Structure Mismatches
- Check if API response structure matches expected TypeScript interfaces
- Look for missing fields like `groups`, `worksite_name`, etc.

#### React/Navigation Issues
- Ensure component is actually mounting
- Check if navigation is working correctly
- Verify modal is being rendered

### 5. Quick Fixes

#### If No Debug Logs Appear
- Component might not be mounting
- Check if navigation is correctly configured
- Verify React development environment is working

#### If API Calls Fail
- Check backend server is running on localhost:8000
- Verify user has proper permissions for user management
- Check authentication state

#### If Modal Doesn't Open
- Look for console errors in `UserDetailModal`
- Check if `currentUser` is loaded properly
- Verify modal props are being passed correctly

## Debug Log Examples

### Successful Flow:
```
UserManagementScreen: Component rendered
UserManagementScreen: useEffect triggered - mounting component
UserManagementScreen: Loading current user...
UserService: getCurrentUser called
UserService: getCurrentUser response: {id: 1, username: "admin", ...}
UserManagementScreen: Current user loaded successfully: {id: 1, ...}
UserManagementScreen: Loading users...
UserService: getUsers called with params: {search: undefined}
UserService: getUsers response: {results: [...], count: 5}
UserManagementScreen: Users count: 5
UserManagementScreen: About to render main UI
```

### Error Flow:
```
UserManagementScreen: Component rendered
UserManagementScreen: Loading users...
UserService: getUsers called with params: {search: undefined}
UserService: getUsers error: {message: "Network Error", ...}
UserManagementScreen: Failed to load users: Network Error
```

## Next Steps After Debugging

1. **Identify Root Cause**: Use console logs to pinpoint exact failure point
2. **Fix Specific Issue**: Address backend, frontend, or data structure problems
3. **Remove Debug Logs**: Clean up console.log statements once working
4. **Add Production Error Handling**: Replace debug logs with user-friendly error messages