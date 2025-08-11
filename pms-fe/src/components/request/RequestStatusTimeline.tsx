import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { Colors, Spacing } from '@/constants/theme';
import { ApprovalHistory, REQUEST_STATUS_LABELS } from '@/types/requests';
import { formatDate } from '@/utils/helpers';

interface RequestStatusTimelineProps {
  approvalHistory: ApprovalHistory[];
  currentStatus: string;
}

const RequestStatusTimeline: React.FC<RequestStatusTimelineProps> = ({
  approvalHistory,
  currentStatus,
}) => {
  const getStatusIcon = (action: string): string => {
    switch (action) {
      case 'submitted': return 'send';
      case 'approved': return 'check-circle';
      case 'rejected': return 'cancel';
      case 'revision_requested': return 'edit';
      case 'revised': return 'refresh';
      case 'final_approved': return 'verified';
      case 'assigned_purchasing': return 'shopping-cart';
      case 'ordered': return 'receipt';
      case 'delivered': return 'local-shipping';
      case 'completed': return 'task-alt';
      default: return 'circle';
    }
  };

  const getStatusColor = (action: string): string => {
    switch (action) {
      case 'approved':
      case 'final_approved':
      case 'completed': return Colors.success;
      case 'rejected': return Colors.error;
      case 'revision_requested': return Colors.warning;
      case 'submitted':
      case 'revised':
      case 'assigned_purchasing':
      case 'ordered':
      case 'delivered': return Colors.primary;
      default: return Colors.textSecondary;
    }
  };

  if (approvalHistory.length === 0) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.title}>
            Request Timeline
          </Text>
          <Text style={styles.emptyText}>No history available</Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>
          Request Timeline
        </Text>
        
        <View style={styles.timeline}>
          {approvalHistory.map((item, index) => (
            <View key={item.id} style={styles.timelineItem}>
              <View style={styles.timelineIcon}>
                <Icon
                  name={getStatusIcon(item.action)}
                  size={20}
                  color={getStatusColor(item.action)}
                />
              </View>
              
              <View style={styles.timelineContent}>
                <Text style={[styles.actionText, { color: getStatusColor(item.action) }]}>
                  {item.action.replace('_', ' ').toUpperCase()}
                </Text>
                <Text style={styles.userText}>by {item.user_name}</Text>
                <Text style={styles.dateText}>{formatDate(item.created_at, true)}</Text>
                
                {item.notes && (
                  <Text style={styles.notesText}>"{item.notes}"</Text>
                )}
                
                {item.review_notes && (
                  <Text style={styles.reviewNotesText}>
                    Review Notes: {item.review_notes}
                  </Text>
                )}
              </View>
              
              {index < approvalHistory.length - 1 && (
                <View style={styles.timelineLine} />
              )}
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  timeline: {
    position: 'relative',
  },
  timelineItem: {
    flexDirection: 'row',
    paddingBottom: Spacing.md,
    position: 'relative',
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    elevation: 2,
  },
  timelineContent: {
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  notesText: {
    fontSize: 12,
    color: Colors.text,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
    backgroundColor: Colors.surfaceVariant,
    padding: Spacing.xs,
    borderRadius: 4,
  },
  reviewNotesText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '500',
    marginTop: Spacing.xs,
    backgroundColor: '#FFF3CD',
    padding: Spacing.xs,
    borderRadius: 4,
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 2,
    bottom: -Spacing.md,
    backgroundColor: Colors.border,
  },
});

export default RequestStatusTimeline;