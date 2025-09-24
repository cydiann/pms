import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { AuthState, AuthContextType, LoginRequest, User, TokenPair } from '../types/auth';
import authService from '../services/authService';

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: true,
  error: null,
};

// Action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; tokens: TokenPair } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        accessToken: action.payload.tokens.access,
        refreshToken: action.payload.tokens.refresh,
        loading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        loading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        loading: false,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component props interface
interface AuthProviderProps {
  readonly children: React.ReactNode;
}

// Provider component
export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [authState, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on app start
  const checkAuthStatus = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const storedUser = await authService.getStoredUser();
      const storedTokens = await authService.getStoredTokens();
      
      if (storedUser && storedTokens) {
        const isAuth = await authService.isAuthenticated();
        if (isAuth) {
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: {
              user: storedUser,
              tokens: storedTokens,
            },
          });
          return;
        }
      }
      
      // Not authenticated or tokens invalid
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error: unknown) {
      console.warn('Auth check error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const { user, tokens } = await authService.login(credentials);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, tokens },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({
        type: 'AUTH_FAILURE',
        payload: errorMessage,
      });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
      dispatch({ type: 'LOGOUT' });
    } catch (error: unknown) {
      console.warn('Logout error:', error);
      // Still dispatch logout to clear local state
      dispatch({ type: 'LOGOUT' });
    }
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const success = await authService.refreshAccessToken();
      if (success) {
        const tokens = await authService.getStoredTokens();
        if (tokens) {
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: {
              user: authState.user as User,
              tokens,
            },
          });
        }
      }
      return success;
    } catch (error: unknown) {
      console.warn('Token refresh error:', error);
      return false;
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const contextValue: AuthContextType = {
    authState,
    login,
    logout,
    refreshAccessToken,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export types
export type { AuthProviderProps };