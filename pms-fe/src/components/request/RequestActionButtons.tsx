import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

import { Colors, Spacing, Dimensions } from '@/constants/theme';
import { Request } from '@/types/requests';
import { User } from '@/types/auth';
import { canEditRequest, canApproveRequest } from '@/utils/helpers';

interface RequestActionButtonsProps {
  request: Request;
  currentUser: User;
  onEdit?: () => void;
  onSubmit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onRequestRevision?: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

const RequestActionButtons: React.FC<RequestActionButtonsProps> = ({
  request,
  currentUser,
  onEdit,
  onSubmit,
  onApprove,
  onReject,
  onRequestRevision,
  onDelete,
  isLoading = false,
}) => {
  const canEdit = canEditRequest(request, currentUser);
  const canApprove = canApproveRequest(request, currentUser);
  const isOwner = request.created_by === currentUser.id;
  
  // Draft status actions
  if (request.status === 'draft') {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          {onEdit && (
            <Button
              mode="outlined"
              onPress={onEdit}
              disabled={isLoading}
              style={[styles.button, styles.secondaryButton]}
              contentStyle={styles.buttonContent}
              icon="edit"
            >
              Edit
            </Button>
          )}
          
          {onSubmit && (
            <Button
              mode="contained"
              onPress={onSubmit}
              disabled={isLoading}
              loading={isLoading}
              style={[styles.button, styles.primaryButton]}
              contentStyle={styles.buttonContent}
              icon="send"
            >
              Submit for Approval
            </Button>
          )}
        </View>
        
        {onDelete && isOwner && (
          <Button
            mode="outlined"
            onPress={onDelete}
            disabled={isLoading}
            style={[styles.button, styles.deleteButton]}
            contentStyle={styles.buttonContent}
            icon="delete"
            textColor={Colors.error}
          >
            Delete Draft
          </Button>
        )}
      </View>
    );
  }

  // Revision requested - back to owner
  if (request.status === 'revision_requested' && isOwner) {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          {onEdit && (
            <Button
              mode="contained"
              onPress={onEdit}
              disabled={isLoading}
              style={[styles.button, styles.primaryButton]}
              contentStyle={styles.buttonContent}
              icon="edit"
            >
              Revise Request
            </Button>
          )}
        </View>
      </View>
    );
  }

  // Pending/In Review - supervisor actions
  if ((request.status === 'pending' || request.status === 'in_review') && canApprove) {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          {onApprove && (
            <Button
              mode="contained"
              onPress={onApprove}
              disabled={isLoading}
              loading={isLoading && onApprove}
              style={[styles.button, styles.approveButton]}
              contentStyle={styles.buttonContent}
              icon="check"
              buttonColor={Colors.success}
            >
              Approve
            </Button>
          )}
          
          {onReject && (
            <Button
              mode="outlined"
              onPress={onReject}
              disabled={isLoading}
              style={[styles.button, styles.rejectButton]}
              contentStyle={styles.buttonContent}
              icon="close"
              textColor={Colors.error}
            >
              Reject
            </Button>
          )}
        </View>
        
        {onRequestRevision && (
          <Button
            mode="outlined"
            onPress={onRequestRevision}
            disabled={isLoading}
            style={[styles.button, styles.revisionButton]}
            contentStyle={styles.buttonContent}
            icon="edit"
            textColor={Colors.warning}
          >
            Request Revision
          </Button>
        )}
      </View>
    );
  }

  // Approved - purchasing team actions
  if (request.status === 'approved') {
    return (
      <View style={styles.container}>
        <View style={styles.infoContainer}>
          <Button
            mode="outlined"
            disabled
            style={[styles.button, styles.infoButton]}
            contentStyle={styles.buttonContent}
            icon="check-circle"
            textColor={Colors.success}
          >
            Approved - Ready for Purchase
          </Button>
        </View>
      </View>
    );
  }

  // Other statuses - informational
  const getStatusButton = () => {
    switch (request.status) {
      case 'purchasing':
        return { text: 'Being Processed by Purchasing Team', icon: 'shopping-cart', color: Colors.primary };
      case 'ordered':
        return { text: 'Order Placed - Awaiting Delivery', icon: 'receipt', color: Colors.primary };
      case 'delivered':
        return { text: 'Delivered - Pending Completion', icon: 'local-shipping', color: Colors.primary };
      case 'completed':
        return { text: 'Request Completed', icon: 'task-alt', color: Colors.success };
      case 'rejected':
        return { text: 'Request Rejected', icon: 'cancel', color: Colors.error };
      default:
        return null;
    }
  };

  const statusButton = getStatusButton();
  if (!statusButton) return null;

  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <Button
          mode="outlined"
          disabled
          style={[styles.button, styles.infoButton]}
          contentStyle={styles.buttonContent}
          icon={statusButton.icon}
          textColor={statusButton.color}
        >
          {statusButton.text}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoContainer: {
    alignItems: 'center',
  },
  button: {
    flex: 1,
  },
  buttonContent: {
    height: Dimensions.button.height,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    borderColor: Colors.primary,
  },
  approveButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    borderColor: Colors.error,
  },
  revisionButton: {
    borderColor: Colors.warning,
  },
  deleteButton: {
    borderColor: Colors.error,
  },
  infoButton: {
    minWidth: '80%',
  },
});

export default RequestActionButtons;