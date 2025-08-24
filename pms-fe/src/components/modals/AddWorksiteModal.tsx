import React, { useState, useEffect } from 'react';
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
import { showAlert, showConfirm, showError, showSuccess } from '../../utils/platformUtils';

interface AddWorksiteModalProps {
  visible: boolean;
  onClose: () => void;
  onWorksiteCreated?: (worksite: WorkSite) => void;
  currentUser: ExtendedUser;
}

interface FormData {
  address: string;
  city: string;
  country: string;
  chief: number | null;
}

interface FormErrors {
  address?: string;
  city?: string;
  country?: string;
  general?: string;
}

// Common countries list with translations
const COUNTRIES = [
  { en: 'Turkey', tr: 'Türkiye' },
  { en: 'Germany', tr: 'Almanya' },
  { en: 'United States', tr: 'Amerika Birleşik Devletleri' },
  { en: 'United Kingdom', tr: 'Birleşik Krallık' },
  { en: 'France', tr: 'Fransa' },
  { en: 'Italy', tr: 'İtalya' },
  { en: 'Spain', tr: 'İspanya' },
  { en: 'Netherlands', tr: 'Hollanda' },
  { en: 'Belgium', tr: 'Belçika' },
  { en: 'Switzerland', tr: 'İsviçre' },
];

const AddWorksiteModal: React.FC<AddWorksiteModalProps> = ({
  visible,
  onClose,
  onWorksiteCreated,
  currentUser,
}) => {
  console.log('AddWorksiteModal: Rendered with visible:', visible);
  
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
      console.log('AddWorksiteModal: Modal opened, loading data...');
      loadPotentialChiefs();
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setFormData({
      address: '',
      city: '',
      country: i18n.language === 'tr' ? 'Turkey' : 'Turkey', // Default to Turkey
      chief: null,
    });
    setErrors({});
  };

  const loadPotentialChiefs = async () => {
    try {
      setLoading(true);
      console.log('AddWorksiteModal: Loading potential chiefs...');
      
      // Get all users who could potentially be chiefs
      const usersData = await userService.getUsers({ page_size: 100 });
      console.log('AddWorksiteModal: Loaded potential chiefs:', usersData.results.length);
      
      // Filter to get suitable candidates (exclude current user, prefer supervisors/admins)
      const chiefs = usersData.results.filter(user => 
        user.id !== currentUser.id && user.is_active
      );
      
      setPotentialChiefs(chiefs);
      
    } catch (error: any) {
      console.error('AddWorksiteModal: Failed to load potential chiefs:', error);
      // Continue without chiefs - not critical for worksite creation
      setPotentialChiefs([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
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
  };

  const handleSubmit = async () => {
    console.log('AddWorksiteModal: Submit attempted');
    console.log('AddWorksiteModal: Current user:', currentUser);
    console.log('AddWorksiteModal: Is user admin?', currentUser?.is_superuser);
    console.log('AddWorksiteModal: Form data:', formData);
    
    if (!currentUser) {
      console.log('AddWorksiteModal: No current user available');
      showError('Error', 'User information not loaded. Please try again.');
      return;
    }

    if (!currentUser.is_superuser) {
      console.log('AddWorksiteModal: User is not admin');
      showError('Error', 'You do not have permission to create worksites.');
      return;
    }

    if (!validateForm()) {
      console.log('AddWorksiteModal: Validation failed:', errors);
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

      console.log('AddWorksiteModal: Submitting worksite data:', submitData);

      const newWorksite = await organizationService.createWorksite(submitData);
      console.log('AddWorksiteModal: Worksite created successfully:', newWorksite);

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
      console.error('AddWorksiteModal: Failed to create worksite:', error);
      
      // Handle specific validation errors from backend
      if (error.status === 400 && error.data) {
        const backendErrors: FormErrors = {};
        
        if (error.data.address) {
          backendErrors.address = Array.isArray(error.data.address) 
            ? error.data.address[0] 
            : error.data.address;
        }
        
        if (error.data.city) {
          backendErrors.city = Array.isArray(error.data.city) 
            ? error.data.city[0] 
            : error.data.city;
        }
        
        if (Object.keys(backendErrors).length > 0) {
          setErrors(backendErrors);
          return;
        }
      }
      
      // Generic error handling
      setErrors({ 
        general: error.message || t('addWorksite.error.createFailed')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getCountryName = (country: string): string => {
    const countryObj = COUNTRIES.find(c => c.en === country);
    return countryObj ? countryObj[i18n.language as 'en' | 'tr'] || countryObj.en : country;
  };

  const getSelectedChiefName = (): string => {
    const chief = potentialChiefs.find(u => u.id === formData.chief);
    return chief ? chief.full_name : t('addWorksite.noChief');
  };

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
                          {country[i18n.language as 'en' | 'tr'] || country.en}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontWeight: 'bold',
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
    fontWeight: '600',
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
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
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
    fontWeight: '600',
  },
});

export default AddWorksiteModal;