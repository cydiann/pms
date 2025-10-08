import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import requestService from '../../services/requestService';
import { Request } from '../../types/requests';
import FileUpload from '../common/FileUpload';
import DocumentList from '../common/DocumentList';
import { showError, showSuccess } from '../../utils/platformUtils';
import { useAuth } from '../../store/AuthContext';

interface RequestDetailModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly request: Request | null;
  readonly onRequestUpdated?: () => void;
}

function RequestDetailModal({
  visible,
  onClose,
  request: initialRequest,
  onRequestUpdated,
}: RequestDetailModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const { authState } = useAuth();
  const user = authState.user;
  const [request, setRequest] = useState<Request | null>(initialRequest);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [notes, setNotes] = useState('');
  const [documentListKey, setDocumentListKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRequest, setEditedRequest] = useState<Partial<Request>>({});
  const [refreshing, setRefreshing] = useState(false);

  // Update local request when prop changes
  useEffect(() => {
    setRequest(initialRequest);
  }, [initialRequest]);

  // Refetch request data to get latest updates
  const refetchRequest = async () => {
    if (!request?.id) return;

    try {
      setRefreshing(true);
      const updated = await requestService.getRequest(request.id);
      setRequest(updated);
    } catch (error) {
      console.error('Failed to refetch request:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmitRequest = async (): Promise<void> => {
    if (!request) {
      return;
    }

    try {
      setSubmitting(true);

      await requestService.submitRequest(request.id);

      // Close modal immediately and refresh list
      onRequestUpdated?.();
      onClose();

      // Show success message after modal is closed
      setTimeout(() => {
        showSuccess('Success', 'Request submitted for approval successfully!');
      }, 300);
    } catch (error: unknown) {
      console.error('Submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit request';
      showError('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (): Promise<void> => {
    if (!request) return;

    try {
      setApproving(true);
      await requestService.approveRequest(request.id, { notes: notes || '' });

      // Refetch to get updated status
      await refetchRequest();
      onRequestUpdated?.();
      setNotes(''); // Clear notes after approval

      showSuccess('Success', 'Request approved successfully!');
    } catch (error: unknown) {
      console.error('Approval error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve request';
      showError('Error', errorMessage);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = (): void => {
    if (!request) return;

    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setRejecting(true);
              await requestService.rejectRequest(request.id, { notes: 'Request rejected' });

              onRequestUpdated?.();
              onClose();

              setTimeout(() => {
                showSuccess('Success', 'Request rejected');
              }, 300);
            } catch (error: unknown) {
              console.error('Rejection error:', error);
              const errorMessage = error instanceof Error ? error.message : 'Failed to reject request';
              showError('Error', errorMessage);
            } finally {
              setRejecting(false);
            }
          },
        },
      ]
    );
  };

  const handleRequestRevision = async (): Promise<void> => {
    if (!request) return;

    if (!notes.trim()) {
      showError('Error', 'Please provide revision notes');
      return;
    }

    try {
      setRejecting(true);
      await requestService.requestRevision(request.id, { notes });

      onRequestUpdated?.();
      onClose();

      setTimeout(() => {
        showSuccess('Success', 'Revision requested');
      }, 300);
    } catch (error: unknown) {
      console.error('Request revision error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to request revision';
      showError('Error', errorMessage);
    } finally {
      setRejecting(false);
    }
  };

  const handleEditPress = (): void => {
    if (!request) return;
    setEditedRequest({
      item: request.item,
      description: request.description,
      quantity: request.quantity,
      unit: request.unit,
      category: request.category,
      delivery_address: request.delivery_address,
      reason: request.reason,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = (): void => {
    setIsEditing(false);
    setEditedRequest({});
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!request) return;

    try {
      setSubmitting(true);

      // Prepare data with proper types
      const updateData: any = {};
      if (editedRequest.item) updateData.item = editedRequest.item;
      if (editedRequest.description) updateData.description = editedRequest.description;
      if (editedRequest.quantity) updateData.quantity = parseFloat(editedRequest.quantity as any) || request.quantity;
      if (editedRequest.unit) updateData.unit = editedRequest.unit;
      if (editedRequest.category) updateData.category = editedRequest.category;
      if (editedRequest.delivery_address) updateData.delivery_address = editedRequest.delivery_address;
      if (editedRequest.reason) updateData.reason = editedRequest.reason;

      await requestService.updateRequest(request.id, updateData);

      await refetchRequest();
      onRequestUpdated?.();
      setIsEditing(false);
      setEditedRequest({});

      showSuccess('Success', 'Request updated successfully!');
    } catch (error: any) {
      console.error('Update error:', error);

      // Extract error message from API response
      let errorMessage = 'Failed to update request';
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else {
          // If it's field errors, format them nicely
          const fieldErrors = Object.entries(errorData)
            .map(([field, msgs]: [string, any]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join('\n');
          if (fieldErrors) errorMessage = fieldErrors;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      showError('Update Failed', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsPurchased = async (): Promise<void> => {
    if (!request) return;

    Alert.alert(
      'Mark as Purchased',
      'Confirm that this item has been purchased/ordered?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setPurchasing(true);
              await requestService.markAsOrdered(request.id);

              await refetchRequest();
              onRequestUpdated?.();
              setDocumentListKey(prev => prev + 1); // Refresh documents

              showSuccess('Success', 'Request marked as purchased!');
            } catch (error: unknown) {
              console.error('Mark purchased error:', error);
              const errorMessage = error instanceof Error ? error.message : 'Failed to mark as purchased';
              showError('Error', errorMessage);
            } finally {
              setPurchasing(false);
            }
          },
        },
      ]
    );
  };

  if (!request) return null;

  const canSubmit = request.status === 'draft' && request.created_by === user?.id;
  const canResubmit = request.status === 'revision_requested' && request.created_by === user?.id;
  const canEdit = ['draft', 'revision_requested'].includes(request.status) && request.created_by === user?.id;
  // Only show approve buttons if user is the CURRENT APPROVER (next_approver field)
  // The request object should include next_approver from backend
  const isCurrentApprover = request.next_approver === user?.id;
  const canApprove = ['pending', 'in_review'].includes(request.status) && isCurrentApprover;

  // Purchasing team permissions
  const hasPurchasePermission = user?.is_superuser || user?.can_purchase || false;
  const canMarkAsPurchased = hasPurchasePermission && ['approved', 'purchasing'].includes(request.status);

  const isProcessing = submitting || approving || rejecting || purchasing;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('requests.requestDetails')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <ScrollView style={styles.detailsScrollView} nestedScrollEnabled={false}>
            <View style={styles.statusContainer}>
              <Text style={styles.requestTitle}>{request.item}</Text>
              <View style={[styles.statusBadge, { backgroundColor: requestService.getStatusColor(request.status) }]}>
                <Text style={styles.statusText}>{requestService.getStatusDisplay(request.status)}</Text>
              </View>
            </View>

            {request.next_approver_name && ['pending', 'in_review'].includes(request.status) && (
              <View style={styles.approverInfoBanner}>
                <Text style={styles.approverInfoText}>
                  {t('requests.waitingForApproval', { name: request.next_approver_name })}
                </Text>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.detailRow}>
                <Text style={styles.label}>{t('requests.requestNumber')}:</Text>
                <Text style={styles.value}>{request.request_number}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>{t('requests.item')}:</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedRequest.item || request.item}
                    onChangeText={(text) => setEditedRequest({ ...editedRequest, item: text })}
                    placeholder="Item name"
                  />
                ) : (
                  <Text style={styles.value}>{request.item}</Text>
                )}
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>{t('requests.description')}:</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedRequest.description || request.description}
                    onChangeText={(text) => setEditedRequest({ ...editedRequest, description: text })}
                    placeholder="Description"
                    multiline
                  />
                ) : (
                  <Text style={styles.value}>{request.description || 'N/A'}</Text>
                )}
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>{t('requests.quantity')}:</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={String(editedRequest.quantity !== undefined ? editedRequest.quantity : request.quantity)}
                    onChangeText={(text) => setEditedRequest({ ...editedRequest, quantity: text as any })}
                    placeholder="Quantity"
                    keyboardType="numeric"
                  />
                ) : (
                  <Text style={styles.value}>{request.quantity} {request.unit}</Text>
                )}
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>{t('requests.category')}:</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedRequest.category || request.category}
                    onChangeText={(text) => setEditedRequest({ ...editedRequest, category: text })}
                    placeholder="Category"
                  />
                ) : (
                  <Text style={styles.value}>{request.category || 'N/A'}</Text>
                )}
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>{t('requests.deliveryAddress')}:</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedRequest.delivery_address || request.delivery_address}
                    onChangeText={(text) => setEditedRequest({ ...editedRequest, delivery_address: text })}
                    placeholder="Delivery address"
                    multiline
                  />
                ) : (
                  <Text style={styles.value}>{request.delivery_address || 'N/A'}</Text>
                )}
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>{t('requests.reason')}:</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedRequest.reason || request.reason}
                    onChangeText={(text) => setEditedRequest({ ...editedRequest, reason: text })}
                    placeholder="Reason"
                    multiline
                  />
                ) : (
                  <Text style={styles.value}>{request.reason}</Text>
                )}
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>{t('requests.createdAt')}:</Text>
                <Text style={styles.value}>{new Date(request.created_at).toLocaleDateString()}</Text>
              </View>
            </View>

            {canEdit && !isEditing && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditPress}
              >
                <Text style={styles.editButtonText}>✏️ Edit Request</Text>
              </TouchableOpacity>
            )}

            {isEditing && (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editActionButton, styles.cancelButton]}
                  onPress={handleCancelEdit}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editActionButton, styles.saveButton]}
                  onPress={handleSaveEdit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {canSubmit && (
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmitRequest}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {t('requests.submitForApproval')}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {canResubmit && (
              <View style={styles.resubmitSection}>
                <View style={styles.revisionNotice}>
                  <Text style={styles.revisionNoticeText}>
                    ⚠️ Revision requested. Please review the feedback and resubmit when ready.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.resubmitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmitRequest}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      🔄 Resubmit for Approval
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {canApprove && (
              <View style={styles.approvalSection}>
                <Text style={styles.approvalLabel}>Notes for Approval/Revision:</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add notes (required for revision request)..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  editable={!isProcessing}
                />
                <View style={styles.approvalButtons}>
                  <TouchableOpacity
                    style={[styles.approveButton, isProcessing && styles.buttonDisabled]}
                    onPress={handleApprove}
                    disabled={isProcessing}
                  >
                    {approving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.approveButtonText}>✓ Approve</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.revisionButton, isProcessing && styles.buttonDisabled]}
                    onPress={handleRequestRevision}
                    disabled={isProcessing}
                  >
                    {rejecting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.revisionButtonText}>↻ Revision</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectButton, isProcessing && styles.buttonDisabled]}
                    onPress={handleReject}
                    disabled={isProcessing}
                  >
                    <Text style={styles.rejectButtonText}>✕ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {canMarkAsPurchased && (
              <TouchableOpacity
                style={[styles.purchasedButton, purchasing && styles.submitButtonDisabled]}
                onPress={handleMarkAsPurchased}
                disabled={purchasing}
              >
                {purchasing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    🛒 Mark as Purchased
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Document List with integrated upload buttons */}
          <View style={styles.documentSection}>
            <DocumentList
              requestId={request.id}
              requestStatus={request.status}
              style={styles.documentList}
              refreshTrigger={documentListKey}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa' as const,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    backgroundColor: '#fff' as const,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef' as const,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center' as const,
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2c3e50' as const,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  detailsScrollView: {
    flexGrow: 0, // Don't grow, only take needed space
    padding: 16,
  },
  documentSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  requestTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  label: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 2,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#28a745' as const,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center' as const,
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d' as const,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resubmitSection: {
    marginTop: 16,
  },
  revisionNotice: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#fd7e14',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  revisionNoticeText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '500',
  },
  resubmitButton: {
    backgroundColor: '#fd7e14' as const,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center' as const,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  uploadSection: {
    marginBottom: 16,
  },
  uploadButton: {
    marginBottom: 8,
  },
  documentList: {
    // Additional styles if needed
  },
  approvalSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    marginBottom: 40,
  },
  approvalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2c3e50',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  approvalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  revisionButton: {
    flex: 1,
    backgroundColor: '#fd7e14',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  revisionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#17a2b8',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editInput: {
    flex: 2,
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    color: '#2c3e50',
    backgroundColor: '#f0f8ff',
    textAlign: 'right',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  editActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  approverInfoBanner: {
    backgroundColor: '#e7f3ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  approverInfoText: {
    fontSize: 14,
    color: '#004085',
    fontWeight: '600',
  },
  purchasedButton: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
} as const);

export type { RequestDetailModalProps };
export default RequestDetailModal;