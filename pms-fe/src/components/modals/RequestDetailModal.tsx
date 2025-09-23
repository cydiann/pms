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
import { showError, showSuccess } from '../../utils/platformUtils';

interface RequestDetailModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly request: Request | null;
  readonly onRequestUpdated?: () => void;
}

function RequestDetailModal({
  visible,
  onClose,
  request,
  onRequestUpdated,
}: RequestDetailModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [documentListKey, setDocumentListKey] = useState(0);

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

  if (!request) return null;

  const canSubmit = request.status === 'draft';

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
          <ScrollView style={styles.detailsScrollView} nestedScrollEnabled={false}>
            <View style={styles.statusContainer}>
              <Text style={styles.requestTitle}>{request.item}</Text>
              <View style={[styles.statusBadge, { backgroundColor: requestService.getStatusColor(request.status) }]}>
                <Text style={styles.statusText}>{requestService.getStatusDisplay(request.status)}</Text>
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