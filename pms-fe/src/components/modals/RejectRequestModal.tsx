import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import requestService from '../../services/requestService';
import { Request } from '../../types/requests';
import { showError, showSuccess } from '../../utils/platformUtils';

interface RejectRequestModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly request: Request | null;
  readonly onSuccess?: () => void;
}

function RejectRequestModal({
  visible,
  onClose,
  request,
  onSuccess,
}: RejectRequestModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReject = async (): Promise<void> => {
    if (!request) return;

    if (!reason.trim()) {
      showError(t('messages.error'), t('requests.validation.reasonRequired'));
      return;
    }

    try {
      setSubmitting(true);
      await requestService.rejectRequest(request.id, { reason, notes });

      onClose();
      setReason('');
      setNotes('');

      setTimeout(() => {
        showSuccess(t('messages.success'), t('requests.success.rejected'));
        onSuccess?.();
      }, 300);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reject request';
      showError(t('messages.error'), errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (): void => {
    if (!submitting) {
      setReason('');
      setNotes('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('requests.rejectRequest')}</Text>
              <TouchableOpacity onPress={handleClose} disabled={submitting}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              <Text style={styles.requestInfo}>
                {t('requests.requestNumber')}: {request?.request_number}
              </Text>
              <Text style={styles.requestItem}>{request?.item}</Text>

              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{t('requests.rejectWarning')}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t('requests.rejectionReason')} *
                </Text>
                <TextInput
                  style={styles.textArea}
                  value={reason}
                  onChangeText={setReason}
                  placeholder={t('requests.rejectionReasonPlaceholder')}
                  placeholderTextColor="#6c757d"
                  multiline
                  numberOfLines={3}
                  editable={!submitting}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('requests.additionalNotes')}</Text>
                <TextInput
                  style={styles.textArea}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('requests.additionalNotesPlaceholder')}
                  placeholderTextColor="#6c757d"
                  multiline
                  numberOfLines={3}
                  editable={!submitting}
                />
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.rejectButton, submitting && styles.buttonDisabled]}
                onPress={handleReject}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.rejectButtonText}>{t('requests.reject')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    fontSize: 24,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  body: {
    padding: 20,
  },
  requestInfo: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  requestItem: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: 12,
    marginBottom: 20,
    borderRadius: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#495057',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#adb5bd',
  },
});

export default RejectRequestModal;
