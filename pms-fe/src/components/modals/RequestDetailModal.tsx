import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import requestService from '../../services/requestService';
import { Request } from '../../types/requests';

interface RequestDetailModalProps {
  visible: boolean;
  onClose: () => void;
  request: Request | null;
  onRequestUpdated?: () => void;
}

const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  visible,
  onClose,
  request,
  onRequestUpdated,
}) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitRequest = async () => {
    if (!request) {
      console.log('No request available');
      return;
    }

    console.log('Attempting to submit request:', request.id, request.status);

    try {
      console.log('Starting submission...');
      setSubmitting(true);
      
      const result = await requestService.submitRequest(request.id);
      console.log('Submission result:', result);
      
      // Close modal immediately and refresh list
      console.log('Calling onRequestUpdated and onClose');
      onRequestUpdated?.();
      onClose();
      
      // Show success message after modal is closed
      setTimeout(() => {
        Alert.alert('Success', 'Request submitted for approval successfully!');
      }, 300);
    } catch (error: any) {
      console.error('Submission error:', error);
      Alert.alert('Error', error.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!request) return null;

  const canSubmit = request.status === 'draft';
  console.log('Request detail modal - canSubmit:', canSubmit, 'status:', request.status);

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

        <ScrollView style={styles.content}>
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
              onPress={() => {
                console.log('Submit button pressed!');
                handleSubmitRequest();
              }}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Submit for Approval
                </Text>
              )}
            </TouchableOpacity>
          )}
          
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
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
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: '#28a745',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RequestDetailModal;