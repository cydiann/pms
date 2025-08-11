import { RequestStatus, VALID_TRANSITIONS } from '@/types/requests';
import { UserRole, User } from '@/types/auth';

/**
 * Format date string to readable format
 */
export const formatDate = (dateString: string, includeTime = false): string => {
  try {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }

    return date.toLocaleDateString('en-US', options);
  } catch {
    return 'Invalid date';
  }
};

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export const getRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInMs / (1000 * 60));
      return minutes <= 0 ? 'Just now' : `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }

    if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    if (diffInDays < 7) {
      const days = Math.floor(diffInDays);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }

    return formatDate(dateString);
  } catch {
    return 'Unknown time';
  }
};

/**
 * Determine user role based on user data
 */
export const getUserRole = (user: User): UserRole => {
  if (user.is_superuser) {
    return 'admin';
  }
  
  // Check if user has direct reports (supervisor)
  if (user.direct_reports && user.direct_reports.length > 0) {
    return 'supervisor';
  }
  
  // For now, we'll assume non-admin users are either supervisors or employees
  // This could be enhanced with proper role checking from the backend
  return user.is_staff ? 'supervisor' : 'employee';
};

/**
 * Check if user can perform specific actions based on role
 */
export const getUserPermissions = (user: User) => {
  const role = getUserRole(user);
  
  return {
    canCreateRequests: true, // All users can create requests
    canApproveRequests: role === 'supervisor' || role === 'admin',
    canManageUsers: role === 'admin',
    canViewAllRequests: role === 'admin',
    canManageSystem: role === 'admin',
    canViewTeam: role === 'supervisor' || role === 'admin',
    canResetPasswords: role === 'supervisor' || role === 'admin',
  };
};

/**
 * Check if request status transition is valid
 */
export const canTransitionTo = (currentStatus: RequestStatus, newStatus: RequestStatus): boolean => {
  const validTransitions = VALID_TRANSITIONS[currentStatus] || [];
  return validTransitions.includes(newStatus);
};

/**
 * Get valid next states for a request status
 */
export const getValidTransitions = (status: RequestStatus): RequestStatus[] => {
  return VALID_TRANSITIONS[status] || [];
};

/**
 * Check if user can edit a request
 */
export const canEditRequest = (request: any, currentUser: User): boolean => {
  // Only the creator can edit, and only in draft status
  return request.created_by === currentUser.id && request.status === 'draft';
};

/**
 * Check if user can approve a request
 */
export const canApproveRequest = (request: any, currentUser: User): boolean => {
  const permissions = getUserPermissions(currentUser);
  const validStatuses = ['pending', 'in_review'];
  
  return (
    permissions.canApproveRequests &&
    validStatuses.includes(request.status) &&
    request.current_approver === currentUser.id
  );
};

/**
 * Format request number for display
 */
export const formatRequestNumber = (requestNumber: string): string => {
  return requestNumber.toUpperCase();
};

/**
 * Generate initials from full name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Debounce function for search inputs
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

/**
 * Capitalize first letter of string
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Format number for display
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Check if string is empty or whitespace
 */
export const isEmpty = (str: string | null | undefined): boolean => {
  return !str || str.trim().length === 0;
};

/**
 * Sleep function for delays
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Generate UUID v4
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};