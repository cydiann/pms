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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import requestService from '../../services/requestService';
import { Request } from '../../types/requests';
import { showError, showSuccess } from '../../utils/platformUtils';

interface MarkAsDeliveredModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly request: Request | null;
  readonly onSuccess?: () => void;
}

function MarkAsDeliveredModal({
  visible,
  onClose,
  request,
  onSuccess,
}: MarkAsDeliveredModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [deliveryDate, setDeliveryDate] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [condition, setCondition] = useState<'good' | 'damaged' | ''>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleMarkAsDelivered = async (): Promise<void> => {
    if (!request) return;

    if (!deliveryDate.trim()) {
      showError(t('messages.error'), t('delivery.validation.dateRequired'));
      return;
    }

    if (!condition) {
      showError(t('messages.error'), t('delivery.validation.conditionRequired'));
      return;
    }

    try {
      setSubmitting(true);
      const deliveryNotes = `Delivery Date: ${deliveryDate}\nReceived By: ${receivedBy || 'Not specified'}\nCondition: ${condition}\n${notes}`;

      await requestService.markAsDelivered(request.id, deliveryNotes);

      onClose();
      clearForm();

      setTimeout(() => {
        showSuccess(t('messages.success'), t('delivery.success.markedAsDelivered'));
        onSuccess?.();
      }, 300);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark as delivered';
      showError(t('messages.error'), errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const clearForm = (): void => {
    setDeliveryDate('');
    setReceivedBy('');
    setCondition('');
    setNotes('');
  };

  const handleClose = (): void => {
    if (!submitting) {
      clearForm();
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
              <Text style={styles.title}>{t('delivery.markAsDelivered')}</Text>
              <TouchableOpacity onPress={handleClose} disabled={submitting}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body}>
              <Text style={styles.requestInfo}>
                {t('requests.requestNumber')}: {request?.request_number}
              </Text>
              <Text style={styles.requestItem}>{request?.item}</Text>

              <View style={styles.successBox}>
                <Text style={styles.successText}>{t('delivery.deliveryInfo')}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t('delivery.deliveryDate')} *
                </Text>
                <TextInput
                  style={styles.input}
                  value={deliveryDate}
                  onChangeText={setDeliveryDate}
                  placeholder={t('delivery.deliveryDatePlaceholder')}
                  placeholderTextColor="#6c757d"
                  editable={!submitting}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('delivery.receivedBy')}</Text>
                <TextInput
                  style={styles.input}
                  value={receivedBy}
                  onChangeText={setReceivedBy}
                  placeholder={t('delivery.receivedByPlaceholder')}
                  placeholderTextColor="#6c757d"
                  editable={!submitting}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t('delivery.condition')} *
                </Text>
                <View style={styles.conditionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.conditionButton,
                      condition === 'good' && styles.conditionButtonActive,
                      condition === 'good' && styles.conditionButtonGood,
                    ]}
                    onPress={() => setCondition('good')}
                    disabled={submitting}
                  >
                    <Text
                      style={[
                        styles.conditionButtonText,
                        condition === 'good' && styles.conditionButtonTextActive,
                      ]}
                    >
                      {t('delivery.conditionGood')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.conditionButton,
                      condition === 'damaged' && styles.conditionButtonActive,
                      condition === 'damaged' && styles.conditionButtonDamaged,
                    ]}
                    onPress={() => setCondition('damaged')}
                    disabled={submitting}
                  >
                    <Text
                      style={[
                        styles.conditionButtonText,
                        condition === 'damaged' && styles.conditionButtonTextActive,
                      ]}
                    >
                      {t('delivery.conditionDamaged')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('delivery.deliveryNotes')}</Text>
                <TextInput
                  style={styles.textArea}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('delivery.deliveryNotesPlaceholder')}
                  placeholderTextColor="#6c757d"
                  multiline
                  numberOfLines={4}
                  editable={!submitting}
                />
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.deliveredButton, submitting && styles.buttonDisabled]}
                onPress={handleMarkAsDelivered}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.deliveredButtonText}>{t('delivery.markAsDelivered')}</Text>
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
    maxHeight: '80%',
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
    maxHeight: 400,
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
  successBox: {
    backgroundColor: '#d4edda',
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
    padding: 12,
    marginBottom: 20,
    borderRadius: 4,
  },
  successText: {
    fontSize: 14,
    color: '#155724',
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
  input: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#495057',
  },
  conditionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  conditionButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  conditionButtonActive: {
    borderWidth: 2,
  },
  conditionButtonGood: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  conditionButtonDamaged: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  conditionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  conditionButtonTextActive: {
    color: '#2c3e50',
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
    minHeight: 100,
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
  deliveredButton: {
    backgroundColor: '#007bff',
  },
  deliveredButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#adb5bd',
  },
});

export default MarkAsDeliveredModal;
