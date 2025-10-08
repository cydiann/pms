import { RequestStatus } from '../types/requests';

// Status Display Labels - matches backend status_display
export const STATUS_LABELS: Record<RequestStatus, string> = {
  [RequestStatus.DRAFT]: 'Draft',
  [RequestStatus.PENDING]: 'Pending Approval',
  [RequestStatus.IN_REVIEW]: 'Under Review',
  [RequestStatus.REVISION_REQUESTED]: 'Needs Revision',
  [RequestStatus.APPROVED]: 'Approved',
  [RequestStatus.REJECTED]: 'Rejected',
  [RequestStatus.PURCHASING]: 'In Purchasing',
  [RequestStatus.ORDERED]: 'Ordered',
  [RequestStatus.DELIVERED]: 'Delivered',
  [RequestStatus.COMPLETED]: 'Completed',
};

// Status Colors - for badges/chips
export const STATUS_COLORS: Record<RequestStatus, string> = {
  [RequestStatus.DRAFT]: '#6c757d',        // gray
  [RequestStatus.PENDING]: '#ffc107',      // yellow/amber
  [RequestStatus.IN_REVIEW]: '#17a2b8',    // teal/cyan
  [RequestStatus.REVISION_REQUESTED]: '#fd7e14', // orange
  [RequestStatus.APPROVED]: '#28a745',     // green
  [RequestStatus.REJECTED]: '#dc3545',     // red
  [RequestStatus.PURCHASING]: '#6f42c1',   // purple
  [RequestStatus.ORDERED]: '#20c997',      // teal-green
  [RequestStatus.DELIVERED]: '#007bff',    // blue
  [RequestStatus.COMPLETED]: '#28a745',    // green
};

// Status background colors for mobile chips
export const STATUS_BG_COLORS: Record<RequestStatus, string> = {
  [RequestStatus.DRAFT]: '#e9ecef',
  [RequestStatus.PENDING]: '#fff3cd',
  [RequestStatus.IN_REVIEW]: '#d1ecf1',
  [RequestStatus.REVISION_REQUESTED]: '#ffe5d0',
  [RequestStatus.APPROVED]: '#d4edda',
  [RequestStatus.REJECTED]: '#f8d7da',
  [RequestStatus.PURCHASING]: '#e2d9f3',
  [RequestStatus.ORDERED]: '#d1f2eb',
  [RequestStatus.DELIVERED]: '#cfe2ff',
  [RequestStatus.COMPLETED]: '#d4edda',
};

// Category options - common request categories
export const REQUEST_CATEGORIES = [
  'Office Supplies',
  'IT Equipment',
  'Furniture',
  'Maintenance',
  'Construction Materials',
  'Tools',
  'Safety Equipment',
  'Vehicles',
  'Other',
] as const;

// Unit display labels
export const UNIT_LABELS: Record<string, string> = {
  pieces: 'Pieces',
  kg: 'Kilograms',
  ton: 'Tons',
  meter: 'Meters',
  m2: 'Square Meters',
  m3: 'Cubic Meters',
  liter: 'Liters',
};
