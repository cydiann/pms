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
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import organizationService from '../../services/organizationService';
import userService from '../../services/userService';
import { WorkSite } from '../../types/organization';
import { ExtendedUser } from '../../types/users';
import { showConfirm, showError, showSuccess } from '../../utils/platformUtils';

interface WorksiteDetailModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly worksiteId: number | null;
  readonly onWorksiteUpdated?: () => void;
  readonly currentUser: ExtendedUser;
}

interface UpdateWorksiteData {
  readonly address: string;
  readonly city: string;
  readonly country: string;
  readonly chief?: number;
}

interface FormErrors {
  readonly address?: string;
  readonly city?: string;
  readonly country?: string;
  readonly general?: string;
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
] as const;

function WorksiteDetailModal({
  visible,
  onClose,
  worksiteId,
  onWorksiteUpdated,
  currentUser,
}: WorksiteDetailModalProps): React.JSX.Element {
  
  const { t, i18n } = useTranslation();
  const [worksite, setWorksite] = useState<WorkSite | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [potentialChiefs, setPotentialChiefs] = useState<ExtendedUser[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const [formData, setFormData] = useState<UpdateWorksiteData>({
    address: '',
    city: '',
    country: '',
    chief: undefined,
  });

  useEffect(() => {
    if (visible && worksiteId) {
      loadWorksite();
      loadPotentialChiefs();
    }
  }, [visible, worksiteId, loadWorksite, loadPotentialChiefs]);

  const loadWorksite = useCallback(async (): Promise<void> => {
    if (!worksiteId) {
      return;
    }
    
    try {
      setLoading(true);
      const worksiteData = await organizationService.getWorksite(worksiteId);
      
      setWorksite(worksiteData);
      setFormData({
        address: worksiteData.address,
        city: worksiteData.city,
        country: worksiteData.country,
        chief: worksiteData.chief,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load worksite details';
      showError(t('messages.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  }, [worksiteId, t]);

  const loadPotentialChiefs = useCallback(async (): Promise<void> => {
    try {
      const usersData = await userService.getUsers({ page_size: 100 });
      const chiefs = usersData.results.filter(user => 
        user.id !== currentUser.id && user.is_active
      );
      setPotentialChiefs(chiefs);
    } catch (error: unknown) {
      setPotentialChiefs([]);
    }
  }, [currentUser.id]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.address.trim()) {
      newErrors.address = t('addWorksite.validation.addressRequired');
    } else if (formData.address.trim().length < 5) {
      newErrors.address = t('addWorksite.validation.addressTooShort');
    }

    if (!formData.city.trim()) {
      newErrors.city = t('addWorksite.validation.cityRequired');
    } else if (formData.city.trim().length < 2) {
      newErrors.city = t('addWorksite.validation.cityTooShort');
    }

    if (!formData.country.trim()) {
      newErrors.country = t('addWorksite.validation.countryRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!worksite) return;

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      
      const updateData = {
        address: formData.address.trim(),
        city: formData.city.trim(),
        country: formData.country.trim(),
        chief: formData.chief || undefined,
      };

      const updatedWorksite = await organizationService.updateWorksite(worksite.id, updateData);
      setWorksite(updatedWorksite);
      setEditing(false);
      onWorksiteUpdated?.();
      showSuccess(t('messages.success'), t('worksiteManagement.worksiteUpdated'));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('worksiteManagement.updateWorksiteError');
      showError(t('messages.error'), errorMessage);
    } finally {
      setSaving(false);
    }
  }, [worksite, formData, validateForm, t, onWorksiteUpdated]);

  const handleDelete = () => {
    if (!worksite) return;

    showConfirm(
      t('worksiteManagement.deleteWorksite'),
      t('worksiteManagement.deleteWorksiteConfirm', { name: `${worksite.city}, ${worksite.country}` }),
      async () => {
        try {
          await organizationService.deleteWorksite(worksite.id);
          onWorksiteUpdated?.();
          onClose();
          showSuccess(t('messages.success'), t('worksiteManagement.worksiteDeleted'));
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : t('worksiteManagement.deleteWorksiteError');
          showError(t('messages.error'), errorMessage);
        }
      },
      undefined,
      t('actions.delete'),
      t('actions.cancel'),
      true
    );
  };

  const updateFormField = useCallback(<K extends keyof UpdateWorksiteData>(
    field: K, 
    value: UpdateWorksiteData[K]
  ): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const getCountryName = useCallback((country: string): string => {
    const countryObj = COUNTRIES.find(c => c.en === country);
    return countryObj ? countryObj[i18n.language as 'en' | 'tr'] || countryObj.en : country;
  }, [i18n.language]);

  const getSelectedChiefName = useCallback((): string => {
    const chief = potentialChiefs.find(u => u.id === formData.chief);
    return chief ? chief.full_name : t('addWorksite.noChief');
  }, [potentialChiefs, formData.chief, t]);

  const canEdit = currentUser.is_superuser;
  const canDelete = currentUser.is_superuser && worksite?.id !== currentUser.worksite;

  const renderViewMode = () => {
    if (!worksite) return null;

    return (
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addWorksite.locationInfo')}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('addWorksite.city')}:</Text>
            <Text style={styles.value}>{worksite.city}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('addWorksite.country')}:</Text>
            <Text style={styles.value}>{getCountryName(worksite.country)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('addWorksite.address')}:</Text>
            <Text style={styles.value}>{worksite.address}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addWorksite.managementInfo')}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('addWorksite.chief')}:</Text>
            <Text style={styles.value}>
              {worksite.chief_name || t('addWorksite.noChief')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('worksiteManagement.systemInfo')}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('worksiteManagement.createdAt')}:</Text>
            <Text style={styles.value}>
              {new Date(worksite.created_at).toLocaleDateString()}
            </Text>
          </View>
          
          {worksite.updated_at && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('worksiteManagement.updatedAt')}:</Text>
              <Text style={styles.value}>
                {new Date(worksite.updated_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderEditMode = () => {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {errors.general && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors.general}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addWorksite.locationInfo')}</Text>
          
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addWorksite.managementInfo')}</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('addWorksite.chief')}</Text>
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>{getSelectedChiefName()}</Text>
              <ScrollView style={styles.dropdownOptions} nestedScrollEnabled>
                <TouchableOpacity
                  style={[styles.dropdownOption, !formData.chief && styles.selectedOption]}
                  onPress={() => updateFormField('chief', undefined)}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    !formData.chief && styles.selectedOptionText
                  ]}>
                    {t('addWorksite.noChief')}
                  </Text>
                </TouchableOpacity>
                {potentialChiefs.map(user => (
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
      </KeyboardAvoidingView>
    );
  };

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
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>{t('actions.cancel')}</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.headerTitle}>
              {editing ? t('worksiteManagement.editWorksite') : t('worksiteManagement.worksiteDetails')}
            </Text>
            
            <View style={styles.headerRight}>
              {canEdit && !editing && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setEditing(true)}
                >
                  <Text style={styles.actionButtonText}>{t('actions.edit')}</Text>
                </TouchableOpacity>
              )}
              
              {editing && (
                <TouchableOpacity
                  style={[styles.actionButton, saving && styles.disabledButton]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.actionButtonText}>
                    {saving ? t('forms.pleaseWait') : t('actions.save')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007bff" />
              <Text style={styles.loadingText}>{t('worksiteManagement.loadingWorksite')}</Text>
            </View>
          ) : editing ? (
            renderEditMode()
          ) : (
            renderViewMode()
          )}

          {canDelete && !editing && worksite && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>{t('worksiteManagement.deleteWorksite')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// Helper function to calculate responsive modal dimensions
const getResponsiveModalDimensions = () => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  return {
    width: Math.min(screenWidth * 0.95, 600),
    height: screenHeight * 0.9
  };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  container: {
    width: getResponsiveModalDimensions().width,
    height: getResponsiveModalDimensions().height,
    maxHeight: '90%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    flex: 2,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center' as const,
    color: '#2c3e50',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end' as const,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#007bff',
    fontSize: 16,
  },
  actionButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
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
  infoRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  label: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right' as const,
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
    textAlignVertical: 'top' as const,
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
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center' as const,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
} as const);

export type { WorksiteDetailModalProps, UpdateWorksiteData, FormErrors };
export default WorksiteDetailModal as (props: WorksiteDetailModalProps) => React.JSX.Element;