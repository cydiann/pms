import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { Text, Card, Chip, Divider } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  fetchRequest,
  fetchApprovalHistory,
  submitRequest,
  deleteRequest,
  performApprovalAction,
  selectCurrentRequest,
  selectApprovalHistory,
  selectRequestsLoading
} from '@/store/slices/requestsSlice';
import { selectUser } from '@/store/slices/authSlice';
import { showSuccessNotification, showErrorNotification } from '@/store/slices/appSlice';

import RequestStatusTimeline from '@/components/request/RequestStatusTimeline';
import RequestActionButtons from '@/components/request/RequestActionButtons';
import LoadingScreen from './LoadingScreen';

import { Colors, Spacing, Shadow } from '@/constants/theme';
import { REQUEST_STATUS_LABELS, UNIT_LABELS } from '@/types/requests';
import { formatDate, formatRequestNumber } from '@/utils/helpers';
import { SUCCESS_MESSAGES } from '@/constants/app';

type RequestDetailsScreenRouteProp = RouteProp<{
  RequestDetails: { requestId: number };
}, 'RequestDetails'>;

const RequestDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RequestDetailsScreenRouteProp>();
  const dispatch = useAppDispatch();

  const requestId = route.params.requestId;
  const request = useAppSelector(selectCurrentRequest);
  const approvalHistory = useAppSelector(selectApprovalHistory);
  const isLoading = useAppSelector(selectRequestsLoading);
  const currentUser = useAppSelector(selectUser);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRequestData();
  }, [requestId]);

  const loadRequestData = async () => {
    await Promise.all([
      dispatch(fetchRequest(requestId)),
      dispatch(fetchApprovalHistory(requestId)),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequestData();
    setRefreshing(false);
  };

  const handleEdit = () => {
    navigation.navigate('CreateRequest' as never, { editRequestId: requestId } as never);
  };

  const handleSubmit = async () => {
    if (!request) return;

    Alert.alert(
      'Submit Request',
      'Are you sure you want to submit this request for approval? You won\'t be able to edit it afterwards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            try {
              const result = await dispatch(submitRequest(requestId));
              if (submitRequest.fulfilled.match(result)) {
                dispatch(showSuccessNotification(SUCCESS_MESSAGES.REQUEST_SUBMITTED));
                loadRequestData(); // Refresh data
              } else {
                dispatch(showErrorNotification(
                  result.payload as string || 'Failed to submit request'
                ));
              }
            } catch (error) {
              dispatch(showErrorNotification('Failed to submit request'));
            }
          }
        }
      ]
    );
  };

  const handleApprove = async () => {
    if (!request) return;

    Alert.alert(
      'Approve Request',
      'Are you sure you want to approve this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              const result = await dispatch(performApprovalAction({
                requestId,
                action: { action: 'approve', notes: 'Approved via mobile app' }
              }));
              
              if (performApprovalAction.fulfilled.match(result)) {
                dispatch(showSuccessNotification(SUCCESS_MESSAGES.REQUEST_APPROVED));
                loadRequestData();
              } else {
                dispatch(showErrorNotification(
                  result.payload as string || 'Failed to approve request'
                ));
              }
            } catch (error) {
              dispatch(showErrorNotification('Failed to approve request'));
            }
          }
        }
      ]
    );
  };

  const handleReject = async () => {
    if (!request) return;

    Alert.prompt(
      'Reject Request',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (notes) => {
            if (!notes?.trim()) {
              dispatch(showErrorNotification('Please provide a reason for rejection'));
              return;
            }

            try {
              const result = await dispatch(performApprovalAction({
                requestId,
                action: { action: 'reject', notes: notes.trim() }
              }));
              
              if (performApprovalAction.fulfilled.match(result)) {
                dispatch(showSuccessNotification(SUCCESS_MESSAGES.REQUEST_REJECTED));
                loadRequestData();
              } else {
                dispatch(showErrorNotification(
                  result.payload as string || 'Failed to reject request'
                ));
              }
            } catch (error) {
              dispatch(showErrorNotification('Failed to reject request'));
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const handleRequestRevision = async () => {
    if (!request) return;

    Alert.prompt(
      'Request Revision',
      'Please explain what needs to be revised:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Back',
          style: 'default',
          onPress: async (notes) => {
            if (!notes?.trim()) {
              dispatch(showErrorNotification('Please provide revision notes'));
              return;
            }

            try {
              const result = await dispatch(performApprovalAction({
                requestId,
                action: { action: 'revise', notes: notes.trim() }
              }));
              
              if (performApprovalAction.fulfilled.match(result)) {
                dispatch(showSuccessNotification(SUCCESS_MESSAGES.REQUEST_REVISED));
                loadRequestData();
              } else {
                dispatch(showErrorNotification(
                  result.payload as string || 'Failed to request revision'
                ));
              }
            } catch (error) {
              dispatch(showErrorNotification('Failed to request revision'));
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const handleDelete = async () => {
    if (!request) return;

    Alert.alert(
      'Delete Request',
      'Are you sure you want to delete this draft? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await dispatch(deleteRequest(requestId));
              if (deleteRequest.fulfilled.match(result)) {
                dispatch(showSuccessNotification('Request deleted'));
                navigation.goBack();
              } else {
                dispatch(showErrorNotification(
                  result.payload as string || 'Failed to delete request'
                ));
              }
            } catch (error) {
              dispatch(showErrorNotification('Failed to delete request'));
            }
          }
        }
      ]
    );
  };

  if (isLoading && !request) {
    return <LoadingScreen message="Loading request details..." />;
  }

  if (!request || !currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Request not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Request Header */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <View style={styles.headerInfo}>
                <Text variant="headlineSmall" style={styles.itemName}>
                  {request.item}
                </Text>
                <Text variant="bodyMedium" style={styles.requestNumber}>
                  {formatRequestNumber(request.request_number)}
                </Text>
              </View>
              
              <View style={[
                styles.statusChip,
                { backgroundColor: Colors.status[request.status] }
              ]}>
                <Text style={styles.statusText}>
                  {REQUEST_STATUS_LABELS[request.status]}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Request Details */}
        <Card style={styles.detailsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Request Details
            </Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created by:</Text>
              <Text style={styles.detailValue}>{request.created_by_name}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created:</Text>
              <Text style={styles.detailValue}>{formatDate(request.created_at)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quantity:</Text>
              <Text style={styles.detailValue}>
                {request.quantity} {UNIT_LABELS[request.unit]}
              </Text>
            </View>

            {request.category && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Category:</Text>
                <View style={styles.categoryContainer}>
                  {request.category.split(',').map((cat, index) => (
                    <Chip key={index} compact style={styles.categoryChip}>
                      {cat.trim()}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            {request.description && (
              <>
                <Divider style={styles.divider} />
                <Text style={styles.detailLabel}>Description:</Text>
                <Text style={styles.descriptionText}>{request.description}</Text>
              </>
            )}

            {request.delivery_address && (
              <>
                <Divider style={styles.divider} />
                <Text style={styles.detailLabel}>Delivery Address:</Text>
                <Text style={styles.descriptionText}>{request.delivery_address}</Text>
              </>
            )}

            {request.reason && (
              <>
                <Divider style={styles.divider} />
                <Text style={styles.detailLabel}>Reason for Purchase:</Text>
                <Text style={styles.descriptionText}>{request.reason}</Text>
              </>
            )}

            {request.revision_count > 0 && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.revisionInfo}>
                  <Icon name="refresh" size={16} color={Colors.warning} />
                  <Text style={styles.revisionText}>
                    Revised {request.revision_count} time{request.revision_count > 1 ? 's' : ''}
                  </Text>
                </View>
                {request.revision_notes && (
                  <Text style={styles.revisionNotes}>{request.revision_notes}</Text>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Status Timeline */}
        <RequestStatusTimeline
          approvalHistory={approvalHistory}
          currentStatus={request.status}
        />
      </ScrollView>

      {/* Action Buttons */}
      <RequestActionButtons
        request={request}
        currentUser={currentUser}
        onEdit={handleEdit}
        onSubmit={handleSubmit}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestRevision={handleRequestRevision}
        onDelete={handleDelete}
        isLoading={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  headerCard: {
    marginBottom: Spacing.md,
    ...Shadow.medium,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  itemName: {
    color: Colors.text,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  requestNumber: {
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  statusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  statusText: {
    color: Colors.textOnPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  detailsCard: {
    marginBottom: Spacing.md,
    ...Shadow.small,
  },
  sectionTitle: {
    color: Colors.text,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    minHeight: 32,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  categoryContainer: {
    flex: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  categoryChip: {
    height: 24,
  },
  divider: {
    marginVertical: Spacing.md,
    backgroundColor: Colors.divider,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  revisionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  revisionText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '500',
  },
  revisionNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    backgroundColor: Colors.surfaceVariant,
    padding: Spacing.sm,
    borderRadius: 6,
  },
  errorText: {
    textAlign: 'center',
    color: Colors.error,
    fontSize: 16,
    marginTop: Spacing.xl,
  },
});

export default RequestDetailsScreen;