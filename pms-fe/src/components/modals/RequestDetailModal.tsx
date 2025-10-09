import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import requestService from '../../services/requestService';
import { Request } from '../../types/requests';
import FileUpload from '../common/FileUpload';
import DocumentList from '../common/DocumentList';
import ApprovalHistory from '../common/ApprovalHistory';
import RequestStatusProgress from '../common/RequestStatusProgress';
import ApproveRequestModal from './ApproveRequestModal';
import RejectRequestModal from './RejectRequestModal';
import RequestRevisionModal from './RequestRevisionModal';
import MarkAsOrderedModal from './MarkAsOrderedModal';
import MarkAsDeliveredModal from './MarkAsDeliveredModal';
import { showError, showSuccess } from '../../utils/platformUtils';

interface RequestDetailModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly request: Request | null;
  readonly onRequestUpdated?: () => void;
  readonly canApprove?: boolean;
  readonly canPurchase?: boolean;
}

function RequestDetailModal({
  visible,
  onClose,
  request,
  onRequestUpdated,
  canApprove = false,
  canPurchase = false,
}: RequestDetailModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [documentListKey, setDocumentListKey] = useState(0);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [revisionModalVisible, setRevisionModalVisible] = useState(false);
  const [orderedModalVisible, setOrderedModalVisible] = useState(false);
  const [deliveredModalVisible, setDeliveredModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'documents'>('details');

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

  const handleActionSuccess = (): void => {
    onRequestUpdated?.();
    onClose();
  };

  if (!request) return null;

  const canSubmit = request.status === 'draft';
  const canTakeAction = canApprove && (request.status === 'pending' || request.status === 'in_review');
  const canMarkOrdered = canPurchase && (request.status === 'approved' || request.status === 'purchasing');
  const canMarkDelivered = canPurchase && request.status === 'ordered';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      statusBarTranslucent={true}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('requests.requestDetails')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          {/* Tab Navigation */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'details' && styles.activeTab]}
              onPress={() => setActiveTab('details')}
            >
              <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
                {t('requests.tabs.details')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'history' && styles.activeTab]}
              onPress={() => setActiveTab('history')}
            >
              <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
                {t('requests.tabs.history')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'documents' && styles.activeTab]}
              onPress={() => setActiveTab('documents')}
            >
              <Text style={[styles.tabText, activeTab === 'documents' && styles.activeTabText]}>
                {t('requests.tabs.documents')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content - Details */}
          {activeTab === 'details' && (
            <ScrollView style={styles.detailsScrollView} nestedScrollEnabled={false}>
              {/* Status Progress */}
              <RequestStatusProgress currentStatus={request.status} />

              <View style={styles.statusContainer}>
                <Text style={styles.requestTitle}>{request.item}</Text>
                <View style={[styles.statusBadge, { backgroundColor: requestService.getStatusColor(request.status) }]}>
                  <Text style={styles.statusText}>{t(`status.${request.status}`)}</Text>
                </View>
              </View>

            <View style={styles.section}>
              <View style={styles.detailRow}>
                <Text style={styles.label}>{t('requests.requestNumber')}:</Text>
                <Text style={styles.value}>{request.request_number}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>{t('requests.item')}:</Text>
                <Text style={styles.value}>{request.item}</Text>
              </View>

              {request.description && (
                <View style={styles.detailRow}>
                  <Text style={styles.label}>{t('requests.description')}:</Text>
                  <Text style={styles.value}>{request.description}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.label}>{t('requests.quantity')}:</Text>
                <Text style={styles.value}>{request.quantity} {request.unit}</Text>
              </View>

              {request.category && (
                <View style={styles.detailRow}>
                  <Text style={styles.label}>{t('requests.category')}:</Text>
                  <Text style={styles.value}>{request.category}</Text>
                </View>
              )}

              {request.delivery_address && (
                <View style={styles.detailRow}>
                  <Text style={styles.label}>{t('requests.deliveryAddress')}:</Text>
                  <Text style={styles.value}>{request.delivery_address}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.label}>{t('requests.reason')}:</Text>
                <Text style={styles.value}>{request.reason}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>{t('requests.createdAt')}:</Text>
                <Text style={styles.value}>{new Date(request.created_at).toLocaleDateString()}</Text>
              </View>
            </View>

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

            {canTakeAction && (
              <View style={styles.supervisorActions}>
                <Text style={styles.actionsTitle}>{t('requests.supervisorActions')}</Text>

                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => setApproveModalVisible(true)}
                >
                  <Text style={styles.actionButtonText}>{t('requests.approve')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.revisionButton]}
                  onPress={() => setRevisionModalVisible(true)}
                >
                  <Text style={styles.actionButtonText}>{t('requests.requestRevision')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => setRejectModalVisible(true)}
                >
                  <Text style={styles.actionButtonText}>{t('requests.reject')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {canMarkOrdered && (
              <View style={styles.purchasingActions}>
                <Text style={styles.actionsTitle}>{t('purchasing.actions')}</Text>

                <TouchableOpacity
                  style={[styles.actionButton, styles.orderedButton]}
                  onPress={() => setOrderedModalVisible(true)}
                >
                  <Text style={styles.actionButtonText}>{t('purchasing.markAsOrdered')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {canMarkDelivered && (
              <View style={styles.purchasingActions}>
                <Text style={styles.actionsTitle}>{t('delivery.actions')}</Text>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deliveredButton]}
                  onPress={() => setDeliveredModalVisible(true)}
                >
                  <Text style={styles.actionButtonText}>{t('delivery.markAsDelivered')}</Text>
                </TouchableOpacity>
              </View>
            )}
            </ScrollView>
          )}

          {/* Tab Content - History */}
          {activeTab === 'history' && (
            <ApprovalHistory
              requestId={request.id}
              style={styles.historyContent}
            />
          )}

          {/* Tab Content - Documents */}
          {activeTab === 'documents' && (
            <View style={styles.documentSection}>
              <DocumentList
                requestId={request.id}
                requestStatus={request.status}
                style={styles.documentList}
                refreshTrigger={documentListKey}
              />
            </View>
          )}
        </View>

        <ApproveRequestModal
          visible={approveModalVisible}
          onClose={() => setApproveModalVisible(false)}
          request={request}
          onSuccess={handleActionSuccess}
        />

        <RejectRequestModal
          visible={rejectModalVisible}
          onClose={() => setRejectModalVisible(false)}
          request={request}
          onSuccess={handleActionSuccess}
        />

        <RequestRevisionModal
          visible={revisionModalVisible}
          onClose={() => setRevisionModalVisible(false)}
          request={request}
          onSuccess={handleActionSuccess}
        />

        <MarkAsOrderedModal
          visible={orderedModalVisible}
          onClose={() => setOrderedModalVisible(false)}
          request={request}
          onSuccess={handleActionSuccess}
        />

        <MarkAsDeliveredModal
          visible={deliveredModalVisible}
          onClose={() => setDeliveredModalVisible(false)}
          request={request}
          onSuccess={handleActionSuccess}
        />
      </SafeAreaView>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007bff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  activeTabText: {
    color: '#007bff',
    fontWeight: '600',
  },
  detailsScrollView: {
    flex: 1,
    padding: 16,
  },
  historyContent: {
    flex: 1,
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
  supervisorActions: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    marginBottom: 40,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  approveButton: {
    backgroundColor: '#28a745',
  },
  revisionButton: {
    backgroundColor: '#fd7e14',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  purchasingActions: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    marginBottom: 40,
  },
  orderedButton: {
    backgroundColor: '#20c997',
  },
  deliveredButton: {
    backgroundColor: '#007bff',
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
} as const);

export type { RequestDetailModalProps };
export default RequestDetailModal;