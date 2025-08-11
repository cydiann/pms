import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { adminService } from '@/services/adminService';

interface AdminStats {
  requests: {
    total: number;
    pending: number;
    approved: number;
    completed: number;
    rejected: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  worksites: {
    total: number;
    active: number;
  };
}

interface RecentActivity {
  id: string;
  action: string;
  description: string;
  user: string;
  timestamp: string;
}

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  worksite_name: string;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
  supervisor_name?: string;
}

interface AdminState {
  // Dashboard data
  stats: AdminStats | null;
  recentActivity: RecentActivity[];
  
  // User management
  users: User[];
  selectedUser: User | null;
  
  // Loading states
  isLoading: boolean;
  usersLoading: boolean;
  
  // Error handling
  error: string | null;
  
  // Pagination
  hasMoreUsers: boolean;
  usersPage: number;
}

const initialState: AdminState = {
  stats: null,
  recentActivity: [],
  users: [],
  selectedUser: null,
  isLoading: false,
  usersLoading: false,
  error: null,
  hasMoreUsers: true,
  usersPage: 1,
};

// Admin dashboard thunks
export const fetchAdminStats = createAsyncThunk(
  'admin/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const stats = await adminService.getAdminStats();
      return stats;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch admin stats');
    }
  }
);

export const fetchRecentActivity = createAsyncThunk(
  'admin/fetchRecentActivity',
  async (params: { limit?: number } = {}, { rejectWithValue }) => {
    try {
      const activity = await adminService.getRecentActivity(params.limit || 10);
      return activity;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch recent activity');
    }
  }
);

// User management thunks
export const fetchUsers = createAsyncThunk(
  'admin/fetchUsers',
  async (params: { 
    page?: number; 
    search?: string; 
    isActive?: boolean; 
    reset?: boolean;
  } = {}, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { admin: AdminState };
      const currentPage = params.reset ? 1 : (params.page || state.admin.usersPage);
      
      const response = await adminService.getUsers({
        page: currentPage,
        search: params.search,
        is_active: params.isActive,
        page_size: 20,
      });
      
      return {
        users: response.results,
        hasMore: response.next !== null,
        page: currentPage,
        isReset: params.reset || currentPage === 1,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch users');
    }
  }
);

export const createUser = createAsyncThunk(
  'admin/createUser',
  async (userData: {
    username: string;
    password: string;
    first_name: string;
    last_name: string;
    email?: string;
    role?: string;
    worksite_id: number;
    supervisor_id?: number;
  }, { rejectWithValue }) => {
    try {
      const user = await adminService.createUser(userData);
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create user');
    }
  }
);

export const updateUser = createAsyncThunk(
  'admin/updateUser',
  async (userData: {
    id: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
    worksite_id?: number;
    supervisor_id?: number;
    is_active?: boolean;
  }, { rejectWithValue }) => {
    try {
      const user = await adminService.updateUser(userData);
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update user');
    }
  }
);

export const resetUserPassword = createAsyncThunk(
  'admin/resetUserPassword',
  async (userId: number, { rejectWithValue }) => {
    try {
      const result = await adminService.resetUserPassword(userId);
      return { userId, tempPassword: result.temp_password };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to reset password');
    }
  }
);

export const deactivateUser = createAsyncThunk(
  'admin/deactivateUser',
  async (userId: number, { rejectWithValue }) => {
    try {
      await adminService.deactivateUser(userId);
      return userId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to deactivate user');
    }
  }
);

export const reactivateUser = createAsyncThunk(
  'admin/reactivateUser',
  async (userId: number, { rejectWithValue }) => {
    try {
      await adminService.reactivateUser(userId);
      return userId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to reactivate user');
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearUsers: (state) => {
      state.users = [];
      state.usersPage = 1;
      state.hasMoreUsers = true;
    },
    setSelectedUser: (state, action: PayloadAction<User | null>) => {
      state.selectedUser = action.payload;
    },
    updateUserInList: (state, action: PayloadAction<User>) => {
      const index = state.users.findIndex(user => user.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = action.payload;
      }
    },
    removeUserFromList: (state, action: PayloadAction<number>) => {
      state.users = state.users.filter(user => user.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    // Fetch admin stats
    builder
      .addCase(fetchAdminStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAdminStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchAdminStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch recent activity
    builder
      .addCase(fetchRecentActivity.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRecentActivity.fulfilled, (state, action) => {
        state.isLoading = false;
        state.recentActivity = action.payload;
      })
      .addCase(fetchRecentActivity.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.usersLoading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.usersLoading = false;
        if (action.payload.isReset) {
          state.users = action.payload.users;
        } else {
          state.users = [...state.users, ...action.payload.users];
        }
        state.hasMoreUsers = action.payload.hasMore;
        state.usersPage = action.payload.page + 1;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.usersLoading = false;
        state.error = action.payload as string;
      });

    // Create user
    builder
      .addCase(createUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users.unshift(action.payload);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update user
    builder
      .addCase(updateUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        if (state.selectedUser?.id === action.payload.id) {
          state.selectedUser = action.payload;
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Reset password
    builder
      .addCase(resetUserPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resetUserPassword.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(resetUserPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Deactivate user
    builder
      .addCase(deactivateUser.fulfilled, (state, action) => {
        const index = state.users.findIndex(user => user.id === action.payload);
        if (index !== -1) {
          state.users[index].is_active = false;
        }
        if (state.selectedUser?.id === action.payload) {
          state.selectedUser.is_active = false;
        }
      });

    // Reactivate user
    builder
      .addCase(reactivateUser.fulfilled, (state, action) => {
        const index = state.users.findIndex(user => user.id === action.payload);
        if (index !== -1) {
          state.users[index].is_active = true;
        }
        if (state.selectedUser?.id === action.payload) {
          state.selectedUser.is_active = true;
        }
      });
  },
});

// Action exports
export const {
  clearError,
  clearUsers,
  setSelectedUser,
  updateUserInList,
  removeUserFromList,
} = adminSlice.actions;

// Selectors
export const selectAdminState = (state: { admin: AdminState }) => state.admin;
export const selectAdminStats = (state: { admin: AdminState }) => state.admin.stats;
export const selectRecentActivity = (state: { admin: AdminState }) => state.admin.recentActivity;
export const selectUsers = (state: { admin: AdminState }) => state.admin.users;
export const selectSelectedUser = (state: { admin: AdminState }) => state.admin.selectedUser;
export const selectAdminLoading = (state: { admin: AdminState }) => state.admin.isLoading;
export const selectUsersLoading = (state: { admin: AdminState }) => state.admin.usersLoading;
export const selectAdminError = (state: { admin: AdminState }) => state.admin.error;
export const selectHasMoreUsers = (state: { admin: AdminState }) => state.admin.hasMoreUsers;

export default adminSlice.reducer;