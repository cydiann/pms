import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import organizationService from '../../services/organizationService';
import userService from '../../services/userService';
import { WorkSite } from '../../types/organization';
import { ExtendedUser } from '../../types/users';
import { showError, showSuccess } from '../../utils/platformUtils';

type SupportedLanguage = 'en' | 'tr';

interface AddWorksiteModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onWorksiteCreated?: (worksite: WorkSite) => void;
  readonly currentUser: ExtendedUser;
}

interface FormData {
  readonly address: string;
  readonly city: string;
  readonly country: string;
  readonly chief: number | null;
}

interface FormErrors {
  readonly address?: string;
  readonly city?: string;
  readonly country?: string;
  readonly general?: string;
}

// Common countries list with translations
const COUNTRIES = [
  { en: 'Turkey' as const, tr: 'Türkiye' as const },
  { en: 'Germany' as const, tr: 'Almanya' as const },
  { en: 'United States' as const, tr: 'Amerika Birleşik Devletleri' as const },
  { en: 'United Kingdom' as const, tr: 'Birleşik Krallık' as const },
  { en: 'France' as const, tr: 'Fransa' as const },
  { en: 'Italy' as const, tr: 'İtalya' as const },
  { en: 'Spain' as const, tr: 'İspanya' as const },
  { en: 'Netherlands' as const, tr: 'Hollanda' as const },
  { en: 'Belgium' as const, tr: 'Belçika' as const },
  { en: 'Switzerland' as const, tr: 'İsviçre' as const },
] as const;

function AddWorksiteModal({
  visible,
  onClose,
  onWorksiteCreated,
  currentUser,
}: AddWorksiteModalProps): React.JSX.Element {
  
  const { t, i18n } = useTranslation();
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    address: '',
    city: '',
    country: 'Turkey',
    chief: null,
  });

  // Validation state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data loading state
  const [loading, setLoading] = useState(false);
  const [potentialChiefs, setPotentialChiefs] = useState<ExtendedUser[]>([]);

  // Load initial data when modal opens
  useEffect(() => {
    if (visible) {
      loadPotentialChiefs();
      resetForm();
    }
  }, [visible, loadPotentialChiefs, resetForm]);

  const resetForm = useCallback((): void => {
    setFormData({
      address: '',
      city: '',
      country: i18n.language === 'tr' ? 'Turkey' : 'Turkey', // Default to Turkey
      chief: null,
    });
    setErrors({});
  }, [i18n.language]);

  const loadPotentialChiefs = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Get all users who could potentially be chiefs
      const usersData = await userService.getUsers({ page_size: 100 });
      
      // Filter to get suitable candidates (exclude current user, prefer supervisors/admins)
      const chiefs = usersData.results.filter(user => 
        user.id !== currentUser.id && user.is_active
      );
      
      setPotentialChiefs(chiefs);
      
    } catch (error: unknown) {
      // Continue without chiefs - not critical for worksite creation
      setPotentialChiefs([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Address validation
    if (!formData.address.trim()) {
      newErrors.address = t('addWorksite.validation.addressRequired');
    } else if (formData.address.trim().length < 5) {
      newErrors.address = t('addWorksite.validation.addressTooShort');
    }

    // City validation
    if (!formData.city.trim()) {
      newErrors.city = t('addWorksite.validation.cityRequired');
    } else if (formData.city.trim().length < 2) {
      newErrors.city = t('addWorksite.validation.cityTooShort');
    }

    // Country validation
    if (!formData.country.trim()) {
      newErrors.country = t('addWorksite.validation.countryRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    
    if (!currentUser) {
      showError('Error', 'User information not loaded. Please try again.');
      return;
    }

    if (!currentUser.is_superuser) {
      showError('Error', 'You do not have permission to create worksites.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Prepare submission data
      const submitData = {
        address: formData.address.trim(),
        city: formData.city.trim(),
        country: formData.country.trim(),
        chief: formData.chief || undefined,
      };


      const newWorksite = await organizationService.createWorksite(submitData);

      // Show success message
      showSuccess(
        t('addWorksite.success.title'),
        t('addWorksite.success.message', { city: newWorksite.city })
      );

      // Reset form and close modal
      resetForm();
      onWorksiteCreated?.(newWorksite);
      onClose();

    } catch (error: any) {
      
      const apiError = error as { status?: number; data?: Record<string, string | string[]>; message?: string };
      
      // Handle specific validation errors from backend
      if (apiError.status === 400 && apiError.data) {
        const backendErrors: FormErrors = {};
        
        if (apiError.data.address) {
          backendErrors.address = Array.isArray(apiError.data.address) 
            ? apiError.data.address[0] 
            : apiError.data.address;
        }
        
        if (apiError.data.city) {
          backendErrors.city = Array.isArray(apiError.data.city) 
            ? apiError.data.city[0] 
            : apiError.data.city;
        }
        
        if (Object.keys(backendErrors).length > 0) {
          setErrors(backendErrors);
          return;
        }
      }
      
      // Generic error handling
      setErrors({ 
        general: apiError.message || t('addWorksite.error.createFailed')
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [currentUser, validateForm, formData, onWorksiteCreated, onClose, resetForm, t]);

  const updateFormField = useCallback((field: keyof FormData, value: string | number | null): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const getCountryName = useCallback((country: string): string => {
    const countryObj = COUNTRIES.find(c => c.en === country);
    return countryObj ? countryObj[i18n.language as SupportedLanguage] || countryObj.en : country;
  }, [i18n.language]);

  const getSelectedChiefName = useCallback((): string => {
    const chief = potentialChiefs.find(u => u.id === formData.chief);
    return chief ? chief.full_name : t('addWorksite.noChief');
  }, [potentialChiefs, formData.chief, t]);

  if (loading) {
    return (
      <Modal 
        visible={visible} 
        animationType="fade" 
        transparent={true}
        statusBarTranslucent={true}
      >
        <View style={styles.overlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.loadingText}>{t('addWorksite.loadingOptions')}</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal 
      visible={visible} 
      animationType="fade" 
      transparent={true}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('actions.cancel')}</Text>
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>{t('addWorksite.title')}</Text>
            
            <TouchableOpacity 
              style={[styles.saveButton, isSubmitting && styles.disabledButton]} 
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.saveButtonText}>
                {isSubmitting ? t('addWorksite.creating') : t('actions.save')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {errors.general && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}

            {/* Location Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('addWorksite.locationInfo')}</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('addWorksite.address')} *</Text>
                <TextInput
                  style={[styles.formInput, errors.address && styles.inputError]}
                  value={formData.address}
                  onChangeText={(value) => updateFormField('address', value)}
                  placeholder={t('addWorksite.addressPlaceholder')}
                  multiline
                  numberOfLines={3}
                />
                {errors.address && <Text style={styles.fieldError}>{errors.address}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('addWorksite.city')} *</Text>
                <TextInput
                  style={[styles.formInput, errors.city && styles.inputError]}
                  value={formData.city}
                  onChangeText={(value) => updateFormField('city', value)}
                  placeholder={t('addWorksite.cityPlaceholder')}
                />
                {errors.city && <Text style={styles.fieldError}>{errors.city}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('addWorksite.country')} *</Text>
                <View style={styles.dropdownContainer}>
                  <Text style={styles.dropdownLabel}>{getCountryName(formData.country)}</Text>
                  <ScrollView style={styles.dropdownOptions} nestedScrollEnabled>
                    {COUNTRIES.map(country => (
                      <TouchableOpacity
                        key={country.en}
                        style={[
                          styles.dropdownOption,
                          formData.country === country.en && styles.selectedOption
                        ]}
                        onPress={() => updateFormField('country', country.en)}
                      >
                        <Text style={[
                          styles.dropdownOptionText,
                          formData.country === country.en && styles.selectedOptionText
                        ]}>
                          {country[i18n.language as SupportedLanguage] || country.en}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                {errors.country && <Text style={styles.fieldError}>{errors.country}</Text>}
              </View>
            </View>

            {/* Management Assignment */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('addWorksite.managementInfo')}</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('addWorksite.chief')}</Text>
                <View style={styles.dropdownContainer}>
                  <Text style={styles.dropdownLabel}>{getSelectedChiefName()}</Text>
                  <ScrollView style={styles.dropdownOptions} nestedScrollEnabled>
                    <TouchableOpacity
                      style={[styles.dropdownOption, !formData.chief && styles.selectedOption]}
                      onPress={() => updateFormField('chief', null)}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        !formData.chief && styles.selectedOptionText
                      ]}>
                        {t('addWorksite.noChief')}
                      </Text>
                    </TouchableOpacity>
                    {Array.isArray(potentialChiefs) && potentialChiefs.map(user => (
                      <TouchableOpacity
                        key={user.id}
                        style={[
                          styles.dropdownOption,
                          formData.chief === user.id && styles.selectedOption
                        ]}
                        onPress={() => updateFormField('chief', user.id)}
                      >
                        <Text style={[
                          styles.dropdownOptionText,
                          formData.chief === user.id && styles.selectedOptionText
                        ]}>
                          {user.full_name} ({userService.getUserRoleDisplay(user, i18n.language)})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <Text style={styles.helperText}>{t('addWorksite.chiefHelp')}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
  },
  saveButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2c3e50',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2c3e50',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  fieldError: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  dropdownLabel: {
    padding: 12,
    fontSize: 16,
    color: '#495057',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  dropdownOptions: {
    maxHeight: 120,
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  selectedOption: {
    backgroundColor: '#e3f2fd',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#495057',
  },
  selectedOptionText: {
    color: '#1976d2',
    fontWeight: '600' as const,
  },
} as const);

export type { AddWorksiteModalProps, FormData, FormErrors, SupportedLanguage };
export default AddWorksiteModal as (props: AddWorksiteModalProps) => React.JSX.Element;