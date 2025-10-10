import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import requestService from '../../services/requestService';
import { CreateRequestDto, RequestUnit } from '../../types/requests';
import { showError, showSuccess } from '../../utils/platformUtils';

interface CreateRequestModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onRequestCreated?: () => void;
}

interface ApiError extends Error {
  readonly status?: number;
  readonly response?: {
    readonly message?: string;
    readonly data?: Record<string, unknown>;
  };
}

function CreateRequestModal({
  visible,
  onClose,
  onRequestCreated,
}: CreateRequestModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateRequestDto>({
    item: '',
    description: '',
    quantity: '',
    unit: RequestUnit.PIECES,
    category: '',
    delivery_address: '',
    reason: '',
  });

  const resetForm = (): void => {
    setFormData({
      item: '',
      description: '',
      quantity: '',
      unit: RequestUnit.PIECES,
      category: '',
      delivery_address: '',
      reason: '',
    });
  };

  const handleSuccess = useCallback((message: string): void => {
    showSuccess(t('messages.success'), message);
  }, [t]);

  const updateFormField = useCallback(<K extends keyof CreateRequestDto>(
    field: K,
    value: CreateRequestDto[K]
  ): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const validateForm = (): boolean => {
    if (!formData.item.trim()) {
      showError(t('messages.error'), t('requests.validation.itemRequired'));
      return false;
    }

    if (!formData.quantity.trim()) {
      showError(t('messages.error'), t('requests.validation.quantityRequired'));
      return false;
    }

    const quantityNumber = parseFloat(formData.quantity);
    if (isNaN(quantityNumber) || quantityNumber <= 0) {
      showError(t('messages.error'), t('requests.validation.quantityInvalid'));
      return false;
    }

    if (!formData.reason.trim()) {
      showError(t('messages.error'), t('requests.validation.reasonRequired'));
      return false;
    }

    return true;
  };

  const handleCreateAndSubmit = async (): Promise<void> => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Create the request
      const newRequest = await requestService.createRequest(formData);
      
      // Submit it immediately
      await requestService.submitRequest(newRequest.id);
      
      // Close modal immediately and refresh list
      resetForm();
      onRequestCreated?.();
      onClose();
      
      // Show success message after modal is closed
      setTimeout(() => {
        handleSuccess(t('requests.success.modalRequestSubmitted', { itemName: formData.item }));
      }, 300);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.message || apiError.message || 'Failed to create and submit request';
      showError(t('messages.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async (): Promise<void> => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await requestService.createRequest(formData);
      // Close modal immediately and refresh list
      resetForm();
      onRequestCreated?.();
      onClose();
      
      // Show success message after modal is closed
      setTimeout(() => {
        handleSuccess(t('requests.success.modalDraftSaved', { itemName: formData.item }));
      }, 300);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.message || apiError.message || 'Failed to save draft';
      showError(t('messages.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const unitOptions = [
    { value: RequestUnit.PIECES, label: t('requests.units.pieces') },
    { value: RequestUnit.KG, label: t('requests.units.kg') },
    { value: RequestUnit.METER, label: t('requests.units.meter') },
    { value: RequestUnit.M2, label: t('requests.units.m2') },
    { value: RequestUnit.LITER, label: t('requests.units.liter') },
  ] as const;

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
          <Text style={styles.headerTitle}>{t('requests.createTitle')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.section}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('requests.item')} *</Text>
              <TextInput
                style={styles.input}
                value={formData.item}
                onChangeText={(value) => updateFormField('item', value)}
                placeholder={t('requests.itemPlaceholder')}
                placeholderTextColor="#6c757d"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('requests.description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(value) => updateFormField('description', value)}
                placeholder={t('requests.descriptionPlaceholder')}
                placeholderTextColor="#6c757d"
                multiline={true}
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.quantityColumn]}>
                <Text style={styles.label}>{t('requests.quantity')} *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.quantity}
                  onChangeText={(value) => updateFormField('quantity', value)}
                  placeholder="0"
                  placeholderTextColor="#6c757d"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, styles.unitColumn]}>
                <Text style={styles.label}>{t('requests.unit')}</Text>
                <View style={styles.unitContainer}>
                  {unitOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.unitOption,
                        formData.unit === option.value && styles.unitOptionActive
                      ]}
                      onPress={() => updateFormField('unit', option.value)}
                    >
                      <Text style={[
                        styles.unitOptionText,
                        formData.unit === option.value && styles.unitOptionTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('requests.category')}</Text>
              <TextInput
                style={styles.input}
                value={formData.category}
                onChangeText={(value) => updateFormField('category', value)}
                placeholder={t('requests.categoryPlaceholder')}
                placeholderTextColor="#6c757d"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('requests.deliveryAddress')}</Text>
              <TextInput
                style={styles.input}
                value={formData.delivery_address}
                onChangeText={(value) => updateFormField('delivery_address', value)}
                placeholder={t('requests.deliveryAddressPlaceholder')}
                placeholderTextColor="#6c757d"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('requests.reason')} *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.reason}
                onChangeText={(value) => updateFormField('reason', value)}
                placeholder={t('requests.reasonPlaceholder')}
                placeholderTextColor="#6c757d"
                multiline={true}
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.draftButton, loading && styles.buttonDisabled]}
              onPress={handleSaveDraft}
              disabled={loading}
            >
              <Text style={styles.draftButtonText}>
                {loading ? t('requests.saving') : t('requests.saveDraft')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleCreateAndSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>{t('requests.createAndSubmit')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
    color: '#2c3e50',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row' as const,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#2c3e50',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top' as const,
  },
  unitContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 4,
  },
  unitOption: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
  },
  unitOptionActive: {
    backgroundColor: '#007bff',
  },
  unitOptionText: {
    fontSize: 10,
    color: '#6c757d',
  },
  unitOptionTextActive: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginTop: 20,
    marginBottom: 40,
    gap: 12,
  },
  draftButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center' as const,
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center' as const,
    flex: 1,
  },
  buttonDisabled: {
    backgroundColor: '#adb5bd',
  },
  draftButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityColumn: {
    flex: 2,
  },
  unitColumn: {
    flex: 1,
    marginLeft: 12,
  },
} as const);

export type { CreateRequestModalProps };
export default CreateRequestModal as (props: CreateRequestModalProps) => React.JSX.Element;