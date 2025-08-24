import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import requestService from '../../services/requestService';
import { CreateRequestDto, RequestUnit } from '../../types/requests';
import { showError, showSuccess } from '../../utils/platformUtils';

const CreateRequestScreen: React.FC = () => {
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

  const handleInputChange = (field: keyof CreateRequestDto, value: string) => {
    // Special handling for quantity field - only allow valid numbers
    if (field === 'quantity') {
      // Allow empty string, numbers, and decimal point
      const numericRegex = /^[0-9]*\.?[0-9]*$/;
      if (value === '' || numericRegex.test(value)) {
        setFormData(prev => ({
          ...prev,
          [field]: value
        }));
      }
      // Ignore invalid input (don't update state)
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.item.trim()) {
      showError(t('messages.error'), t('requests.validation.itemRequired'));
      return false;
    }
    
    if (!formData.quantity.trim()) {
      showError(t('messages.error'), t('requests.validation.quantityRequired'));
      return false;
    }
    
    const quantityNumber = parseFloat(formData.quantity);
    if (isNaN(quantityNumber)) {
      showError(t('messages.error'), t('requests.validation.quantityInvalid'));
      return false;
    }
    
    if (quantityNumber <= 0) {
      showError(t('messages.error'), t('requests.validation.quantityMustBePositive'));
      return false;
    }
    
    if (quantityNumber > 999999) {
      showError(t('messages.error'), t('requests.validation.quantityTooLarge'));
      return false;
    }
    
    if (!formData.reason.trim()) {
      showError(t('messages.error'), t('requests.validation.reasonRequired'));
      return false;
    }

    return true;
  };

  const saveDraft = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const newRequest = await requestService.createRequest(formData);
      showSuccess(
        'Success',
        `Draft request ${newRequest.request_number} has been saved!`,
        () => {
          // Reset form
          setFormData({
            item: '',
            description: '',
            quantity: '',
            unit: RequestUnit.PIECES,
            category: '',
            delivery_address: '',
            reason: '',
          });
        }
      );
    } catch (error: any) {
      showError('Error', error.message || 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Create draft request first
      const newRequest = await requestService.createRequest(formData);
      
      // Then submit it for approval
      await requestService.submitRequest(newRequest.id);
      
      showSuccess(
        'Success',
        `Request ${newRequest.request_number} has been submitted for approval!`,
        () => {
          // Reset form
          setFormData({
            item: '',
            description: '',
            quantity: '',
            unit: RequestUnit.PIECES,
            category: '',
            delivery_address: '',
            reason: '',
          });
        }
      );
    } catch (error: any) {
      showError('Error', error.message || 'Failed to submit request');
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
  ];

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t('requests.createTitle')}
          </Text>
          <Text style={styles.subtitle}>
            {t('requests.createSubtitle')}
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* Item Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('requests.item')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.item}
              onChangeText={(value) => handleInputChange('item', value)}
              placeholder={t('requests.itemPlaceholder')}
              placeholderTextColor="#6c757d"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('requests.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder={t('requests.descriptionPlaceholder')}
              placeholderTextColor="#6c757d"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Quantity and Unit */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>{t('requests.quantity')} *</Text>
              <TextInput
                style={styles.input}
                value={formData.quantity}
                onChangeText={(value) => handleInputChange('quantity', value)}
                placeholder="0"
                placeholderTextColor="#6c757d"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
              <Text style={styles.label}>{t('requests.unit')}</Text>
              <View style={styles.unitSelector}>
                {unitOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.unitOption,
                      formData.unit === option.value && styles.unitOptionActive
                    ]}
                    onPress={() => handleInputChange('unit', option.value)}
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

          {/* Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('requests.category')}</Text>
            <TextInput
              style={styles.input}
              value={formData.category}
              onChangeText={(value) => handleInputChange('category', value)}
              placeholder={t('requests.categoryPlaceholder')}
              placeholderTextColor="#6c757d"
            />
          </View>

          {/* Delivery Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('requests.deliveryAddress')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.delivery_address}
              onChangeText={(value) => handleInputChange('delivery_address', value)}
              placeholder={t('requests.deliveryAddressPlaceholder')}
              placeholderTextColor="#6c757d"
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Reason */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('requests.reason')} *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.reason}
              onChangeText={(value) => handleInputChange('reason', value)}
              placeholder={t('requests.reasonPlaceholder')}
              placeholderTextColor="#6c757d"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.draftButton, loading && styles.buttonDisabled]}
              onPress={saveDraft}
              disabled={loading}
            >
              <Text style={styles.draftButtonText}>
                {loading ? t('requests.saving') : t('requests.saveDraft')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? t('requests.submitting') : t('requests.submitButton')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  formContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#e9ecef',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#495057',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  marginLeft: {
    marginLeft: 10,
  },
  unitSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  unitOption: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  unitOptionActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  unitOptionText: {
    fontSize: 12,
    color: '#6c757d',
  },
  unitOptionTextActive: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 40,
    gap: 12,
  },
  draftButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
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
});

export default CreateRequestScreen;