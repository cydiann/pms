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

interface MarkAsOrderedModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly request: Request | null;
  readonly onSuccess?: () => void;
}

function MarkAsOrderedModal({
  visible,
  onClose,
  request,
  onSuccess,
}: MarkAsOrderedModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleMarkAsOrdered = async (): Promise<void> => {
    if (!request) return;

    if (!purchaseOrderNumber.trim()) {
      showError(t('messages.error'), t('purchasing.validation.poNumberRequired'));
      return;
    }

    try {
      setSubmitting(true);
      const orderNotes = `PO: ${purchaseOrderNumber}\nSupplier: ${supplier || 'N/A'}\nExpected Delivery: ${expectedDeliveryDate || 'Not specified'}\n${notes}`;

      await requestService.markAsOrdered(request.id, orderNotes);

      onClose();
      clearForm();

      setTimeout(() => {
        showSuccess(t('messages.success'), t('purchasing.success.markedAsOrdered'));
        onSuccess?.();
      }, 300);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark as ordered';
      showError(t('messages.error'), errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const clearForm = (): void => {
    setPurchaseOrderNumber('');
    setSupplier('');
    setExpectedDeliveryDate('');
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
              <Text style={styles.title}>{t('purchasing.markAsOrdered')}</Text>
              <TouchableOpacity onPress={handleClose} disabled={submitting}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body}>
              <Text style={styles.requestInfo}>
                {t('requests.requestNumber')}: {request?.request_number}
              </Text>
              <Text style={styles.requestItem}>{request?.item}</Text>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>{t('purchasing.orderInfo')}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {t('purchasing.poNumber')} *
                </Text>
                <TextInput
                  style={styles.input}
                  value={purchaseOrderNumber}
                  onChangeText={setPurchaseOrderNumber}
                  placeholder={t('purchasing.poNumberPlaceholder')}
                  placeholderTextColor="#6c757d"
                  editable={!submitting}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('purchasing.supplier')}</Text>
                <TextInput
                  style={styles.input}
                  value={supplier}
                  onChangeText={setSupplier}
                  placeholder={t('purchasing.supplierPlaceholder')}
                  placeholderTextColor="#6c757d"
                  editable={!submitting}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('purchasing.expectedDeliveryDate')}</Text>
                <TextInput
                  style={styles.input}
                  value={expectedDeliveryDate}
                  onChangeText={setExpectedDeliveryDate}
                  placeholder={t('purchasing.expectedDeliveryDatePlaceholder')}
                  placeholderTextColor="#6c757d"
                  editable={!submitting}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('purchasing.orderNotes')}</Text>
                <TextInput
                  style={styles.textArea}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('purchasing.orderNotesPlaceholder')}
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
                style={[styles.button, styles.orderButton, submitting && styles.buttonDisabled]}
                onPress={handleMarkAsOrdered}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.orderButtonText}>{t('purchasing.markAsOrdered')}</Text>
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
  infoBox: {
    backgroundColor: '#d1ecf1',
    borderLeftWidth: 4,
    borderLeftColor: '#17a2b8',
    padding: 12,
    marginBottom: 20,
    borderRadius: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#0c5460',
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
  orderButton: {
    backgroundColor: '#20c997',
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#adb5bd',
  },
});

export default MarkAsOrderedModal;
