/**
 * Request Helper Utilities
 *
 * Provides utility functions for working with requests in components
 */

import { Request, RequestStatus } from '../types/requests';
import { STATUS_COLORS, STATUS_BG_COLORS, STATUS_LABELS } from '../constants/requests';

/**
 * Get the color for a request status
 */
export const getStatusColor = (status: RequestStatus | string): string => {
  return STATUS_COLORS[status as RequestStatus] || STATUS_COLORS[RequestStatus.DRAFT];
};

/**
 * Get the background color for a request status (for chips/badges)
 */
export const getStatusBgColor = (status: RequestStatus | string): string => {
  return STATUS_BG_COLORS[status as RequestStatus] || STATUS_BG_COLORS[RequestStatus.DRAFT];
};

/**
 * Get the display label for a request status
 * Note: For i18n, use t(`status.${status}`) instead
 */
export const getStatusLabel = (status: RequestStatus | string): string => {
  return STATUS_LABELS[status as RequestStatus] || status;
};

/**
 * Check if a request can be edited by the current user
 */
export const canEditRequest = (request: Request, currentUserId: number): boolean => {
  return request.status === RequestStatus.DRAFT && request.created_by === currentUserId;
};

/**
 * Check if a request can be submitted for approval
 */
export const canSubmitRequest = (request: Request, currentUserId: number): boolean => {
  return request.status === RequestStatus.DRAFT && request.created_by === currentUserId;
};

/**
 * Check if a request can be deleted
 */
export const canDeleteRequest = (request: Request, currentUserId: number): boolean => {
  return request.status === RequestStatus.DRAFT && request.created_by === currentUserId;
};

/**
 * Check if a request is in a final state (completed, rejected)
 */
export const isRequestFinal = (request: Request): boolean => {
  return [RequestStatus.COMPLETED, RequestStatus.REJECTED].includes(request.status);
};

/**
 * Check if a request is awaiting approval
 */
export const isAwaitingApproval = (request: Request): boolean => {
  return [RequestStatus.PENDING, RequestStatus.IN_REVIEW].includes(request.status);
};

/**
 * Check if a request needs revision
 */
export const needsRevision = (request: Request): boolean => {
  return request.status === RequestStatus.REVISION_REQUESTED;
};

/**
 * Format request number for display
 */
export const formatRequestNumber = (requestNumber: string): string => {
  return requestNumber || 'N/A';
};

/**
 * Get a short status description for notifications/alerts
 */
export const getStatusDescription = (status: RequestStatus): string => {
  const descriptions: Record<RequestStatus, string> = {
    [RequestStatus.DRAFT]: 'This request is in draft and has not been submitted',
    [RequestStatus.PENDING]: 'This request is awaiting approval',
    [RequestStatus.IN_REVIEW]: 'This request is currently being reviewed',
    [RequestStatus.REVISION_REQUESTED]: 'Changes have been requested for this item',
    [RequestStatus.APPROVED]: 'This request has been approved and is ready for purchasing',
    [RequestStatus.REJECTED]: 'This request has been rejected',
    [RequestStatus.PURCHASING]: 'This request is with the purchasing team',
    [RequestStatus.ORDERED]: 'This item has been ordered',
    [RequestStatus.DELIVERED]: 'This item has been delivered',
    [RequestStatus.COMPLETED]: 'This request is complete',
  };
  return descriptions[status] || 'Unknown status';
};

/**
 * Sort requests by priority (revision requested > pending > draft > others)
 */
export const sortRequestsByPriority = (requests: Request[]): Request[] => {
  const priorityOrder: Record<RequestStatus, number> = {
    [RequestStatus.REVISION_REQUESTED]: 1,
    [RequestStatus.PENDING]: 2,
    [RequestStatus.IN_REVIEW]: 3,
    [RequestStatus.DRAFT]: 4,
    [RequestStatus.APPROVED]: 5,
    [RequestStatus.PURCHASING]: 6,
    [RequestStatus.ORDERED]: 7,
    [RequestStatus.DELIVERED]: 8,
    [RequestStatus.COMPLETED]: 9,
    [RequestStatus.REJECTED]: 10,
  };

  return [...requests].sort((a, b) => {
    const priorityA = priorityOrder[a.status] || 99;
    const priorityB = priorityOrder[b.status] || 99;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // If same priority, sort by created date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};
