import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Switch,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import userService from '../../services/userService';
import organizationService from '../../services/organizationService';
import { CreateUserDto, ExtendedUser } from '../../types/users';
import { WorkSite } from '../../types/organization';
import AddWorksiteModal from './AddWorksiteModal';
import { showAlert, showError, showSuccess } from '../../utils/platformUtils';

interface AddUserModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onUserCreated?: () => void;
  readonly currentUser: ExtendedUser;
}

interface UserGroup {
  readonly id: number;
  readonly name: string;
  readonly user_count: number;
}

interface FormData {
  readonly username: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly password: string;
  readonly worksite: number | null;
  readonly supervisor: number | null;
  readonly is_superuser: boolean;
  readonly groups: number[];
  readonly generatePassword: boolean;
}

interface FormErrors {
  readonly username?: string;
  readonly first_name?: string;
  readonly last_name?: string;
  readonly password?: string;
  readonly worksite?: string;
  readonly general?: string;
}

function AddUserModal({
  visible,
  onClose,
  onUserCreated,
  currentUser,
}: AddUserModalProps): React.JSX.Element {
  
  const { t, i18n } = useTranslation();
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    worksite: null,
    supervisor: null,
    is_superuser: false,
    groups: [],
    generatePassword: true,
  });

  // Validation state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data loading state
  const [loading, setLoading] = useState(false);
  const [worksites, setWorksites] = useState<WorkSite[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [supervisors, setSupervisors] = useState<ExtendedUser[]>([]);
  
  // Worksite modal state
  const [addWorksiteModalVisible, setAddWorksiteModalVisible] = useState(false);

  // Load initial data when modal opens
  useEffect(() => {
    if (visible) {
      loadInitialData();
      resetForm();
    }
  }, [visible, loadInitialData, resetForm]);

  const resetForm = useCallback((): void => {
    setFormData({
      username: '',
      first_name: '',
      last_name: '',
      password: '',
      worksite: currentUser.worksite || null,
      supervisor: null,
      is_superuser: false,
      groups: [],
      generatePassword: true,
    });
    setErrors({});
  }, [currentUser.worksite]);

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Load data with individual error handling
      let worksitesData: WorkSite[] = [];
      let groupsData: UserGroup[] = [];
      interface UserApiResponse {
        results: ExtendedUser[];
      }
      let usersData: UserApiResponse = { results: [] };

      try {
        worksitesData = await organizationService.getWorksites();
      } catch (error) {
        worksitesData = [];
      }

      try {
        groupsData = await userService.getGroups();
      } catch (error) {
        groupsData = [];
      }

      try {
        usersData = await userService.getUsers({ page_size: 100 });
      } catch (error) {
        usersData = { results: [] };
      }

      // Set state with fallback to empty arrays
      setWorksites(Array.isArray(worksitesData) ? worksitesData : []);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setSupervisors((usersData.results || []).filter((user) => user.id !== currentUser.id));
      
    } catch (error: unknown) {
      showError(
        t('messages.error'),
        'Failed to load form options. Please try again.'
      );
      // Set empty fallbacks
      setWorksites([]);
      setGroups([]);
      setSupervisors([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, t]);

  const generateSecurePassword = useCallback((): string => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = t('addUser.validation.usernameRequired');
    } else if (formData.username.length < 3) {
      newErrors.username = t('addUser.validation.usernameTooShort');
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = t('addUser.validation.usernameInvalid');
    }

    // First name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = t('addUser.validation.firstNameRequired');
    }

    // Last name validation
    if (!formData.last_name.trim()) {
      newErrors.last_name = t('addUser.validation.lastNameRequired');
    }

    // Password validation (if not auto-generating)
    if (!formData.generatePassword) {
      if (!formData.password.trim()) {
        newErrors.password = t('addUser.validation.passwordRequired');
      } else if (formData.password.length < 6) {
        newErrors.password = t('addUser.validation.passwordTooShort');
      }
    }

    // Worksite validation
    if (!formData.worksite) {
      newErrors.worksite = t('addUser.validation.worksiteRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  const handleSubmit = async () => {
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Prepare submission data
      const submitData: CreateUserDto = {
        username: formData.username.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        worksite: formData.worksite!,
        supervisor: formData.supervisor || undefined,
        is_superuser: formData.is_superuser,
        groups: formData.groups,
      };

      // Add password if not auto-generating or if manually entered
      if (formData.generatePassword) {
        submitData.password = generateSecurePassword();
      } else if (formData.password.trim()) {
        submitData.password = formData.password.trim();
      }


      await userService.createUser(submitData);

      // Show success message with generated password if applicable
      if (formData.generatePassword && submitData.password) {
        showAlert(
          t('addUser.success.title'),
          `${t('addUser.success.message')}\n\n${t('addUser.success.generatedPassword')}: ${submitData.password}\n\n${t('addUser.success.passwordWarning')}`,
          [{ text: t('actions.ok'), onPress: () => {} }]
        );
      } else {
        showSuccess(t('addUser.success.title'), t('addUser.success.message'));
      }

      // Reset form and close modal
      resetForm();
      onUserCreated?.();
      onClose();

    } catch (error: unknown) {
      
      // Handle specific validation errors from backend
      if (error.status === 400 && error.data) {
        const backendErrors: FormErrors = {};
        
        if (error.data.username) {
          backendErrors.username = Array.isArray(error.data.username) 
            ? error.data.username[0] 
            : error.data.username;
        }
        
        if (Object.keys(backendErrors).length > 0) {
          setErrors(backendErrors);
          return;
        }
      }
      
      // Generic error handling
      setErrors({ 
        general: error.message || t('addUser.error.createFailed')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormField = useCallback((field: keyof FormData, value: string | number | boolean | number[] | null): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const toggleGroup = (groupId: number) => {
    setFormData(prev => ({
      ...prev,
      groups: prev.groups.includes(groupId)
        ? prev.groups.filter(id => id !== groupId)
        : [...prev.groups, groupId]
    }));
  };

  const handleWorksiteCreated = useCallback((newWorksite: WorkSite): void => {
    
    // Add the new worksite to the list
    setWorksites(prev => [...prev, newWorksite]);
    
    // Auto-select the newly created worksite
    updateFormField('worksite', newWorksite.id);
    
  }, [updateFormField]);

  const handleAddWorksitePress = useCallback((): void => {
    setAddWorksiteModalVisible(true);
  }, []);

  const getSelectedWorksiteName = useCallback((): string => {
    if (!Array.isArray(worksites) || worksites.length === 0) {
      return t('addUser.selectWorksite');
    }
    const worksite = worksites.find(w => w.id === formData.worksite);
    return worksite ? organizationService.getWorksiteDisplayName(worksite) : t('addUser.selectWorksite');
  }, [worksites, formData.worksite, t]);

  const getSelectedSupervisorName = useCallback((): string => {
    if (!Array.isArray(supervisors) || supervisors.length === 0) {
      return t('addUser.selectSupervisor');
    }
    const supervisor = supervisors.find(s => s.id === formData.supervisor);
    return supervisor ? supervisor.full_name : t('addUser.selectSupervisor');
  }, [supervisors, formData.supervisor, t]);

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
            <Text style={styles.loadingText}>{t('addUser.loadingOptions')}</Text>
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
          
          <Text style={styles.headerTitle}>{t('addUser.title')}</Text>
          
          <TouchableOpacity 
            style={[styles.saveButton, isSubmitting && styles.disabledButton]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.saveButtonText}>
              {isSubmitting ? t('addUser.creating') : t('actions.save')}
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {errors.general && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('addUser.basicInfo')}</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('addUser.username')} *</Text>
              <TextInput
                style={[styles.formInput, errors.username && styles.inputError]}
                value={formData.username}
                onChangeText={(value) => updateFormField('username', value)}
                placeholder={t('addUser.usernamePlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.username && <Text style={styles.fieldError}>{errors.username}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('addUser.firstName')} *</Text>
              <TextInput
                style={[styles.formInput, errors.first_name && styles.inputError]}
                value={formData.first_name}
                onChangeText={(value) => updateFormField('first_name', value)}
                placeholder={t('addUser.firstNamePlaceholder')}
              />
              {errors.first_name && <Text style={styles.fieldError}>{errors.first_name}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('addUser.lastName')} *</Text>
              <TextInput
                style={[styles.formInput, errors.last_name && styles.inputError]}
                value={formData.last_name}
                onChangeText={(value) => updateFormField('last_name', value)}
                placeholder={t('addUser.lastNamePlaceholder')}
              />
              {errors.last_name && <Text style={styles.fieldError}>{errors.last_name}</Text>}
            </View>
          </View>

          {/* Password Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('addUser.passwordSection')}</Text>
            
            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>{t('addUser.generatePassword')}</Text>
                <Switch
                  value={formData.generatePassword}
                  onValueChange={(value) => updateFormField('generatePassword', value)}
                />
              </View>
              <Text style={styles.helperText}>{t('addUser.generatePasswordHelp')}</Text>
            </View>

            {!formData.generatePassword && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('addUser.password')} *</Text>
                <TextInput
                  style={[styles.formInput, errors.password && styles.inputError]}
                  value={formData.password}
                  onChangeText={(value) => updateFormField('password', value)}
                  placeholder={t('addUser.passwordPlaceholder')}
                  secureTextEntry
                />
                {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
              </View>
            )}
          </View>

          {/* Organization Assignment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('addUser.organizationInfo')}</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('addUser.worksite')} *</Text>
              <View style={styles.dropdownContainer}>
                <Text style={styles.dropdownLabel}>{getSelectedWorksiteName()}</Text>
                <ScrollView style={styles.dropdownOptions} nestedScrollEnabled>
                  {/* Add New Worksite Option */}
                  <TouchableOpacity
                    style={styles.addNewOption}
                    onPress={handleAddWorksitePress}
                  >
                    <Text style={styles.addNewOptionText}>
                      + {t('addUser.addNewWorksite')}
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Existing Worksites */}
                  {Array.isArray(worksites) && worksites.map(worksite => (
                    <TouchableOpacity
                      key={worksite.id}
                      style={[
                        styles.dropdownOption,
                        formData.worksite === worksite.id && styles.selectedOption
                      ]}
                      onPress={() => updateFormField('worksite', worksite.id)}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        formData.worksite === worksite.id && styles.selectedOptionText
                      ]}>
                        {organizationService.getWorksiteDisplayName(worksite)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  
                  {(!Array.isArray(worksites) || worksites.length === 0) && (
                    <View style={styles.dropdownOption}>
                      <Text style={styles.dropdownOptionText}>No worksites available</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
              {errors.worksite && <Text style={styles.fieldError}>{errors.worksite}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('addUser.supervisor')}</Text>
              <View style={styles.dropdownContainer}>
                <Text style={styles.dropdownLabel}>{getSelectedSupervisorName()}</Text>
                <ScrollView style={styles.dropdownOptions} nestedScrollEnabled>
                  <TouchableOpacity
                    style={[styles.dropdownOption, !formData.supervisor && styles.selectedOption]}
                    onPress={() => updateFormField('supervisor', null)}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      !formData.supervisor && styles.selectedOptionText
                    ]}>
                      {t('addUser.noSupervisor')}
                    </Text>
                  </TouchableOpacity>
                  {Array.isArray(supervisors) && supervisors.map(supervisor => (
                    <TouchableOpacity
                      key={supervisor.id}
                      style={[
                        styles.dropdownOption,
                        formData.supervisor === supervisor.id && styles.selectedOption
                      ]}
                      onPress={() => updateFormField('supervisor', supervisor.id)}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        formData.supervisor === supervisor.id && styles.selectedOptionText
                      ]}>
                        {supervisor.full_name} ({supervisor.username})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          {/* Permissions */}
          {currentUser.is_superuser && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('addUser.permissions')}</Text>
              
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.formLabel}>{t('addUser.superuser')}</Text>
                  <Switch
                    value={formData.is_superuser}
                    onValueChange={(value) => updateFormField('is_superuser', value)}
                  />
                </View>
                <Text style={styles.helperText}>{t('addUser.superuserHelp')}</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('addUser.groups')}</Text>
                <View style={styles.groupsContainer}>
                  {Array.isArray(groups) && groups.map(group => (
                    <TouchableOpacity
                      key={group.id}
                      style={styles.groupItem}
                      onPress={() => toggleGroup(group.id)}
                    >
                      <View style={[
                        styles.checkbox,
                        formData.groups.includes(group.id) && styles.checkedCheckbox
                      ]}>
                        {formData.groups.includes(group.id) && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                      <Text style={styles.groupLabel}>
                        {userService.translateGroupName(group.name, i18n.language)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {(!Array.isArray(groups) || groups.length === 0) && (
                    <Text style={styles.dropdownOptionText}>No groups available</Text>
                  )}
                </View>
              </View>
            </View>
          )}
          </ScrollView>
        </KeyboardAvoidingView>
        </View>

        {/* Add Worksite Modal */}
        <AddWorksiteModal
          visible={addWorksiteModalVisible}
          onClose={() => setAddWorksiteModalVisible(false)}
          onWorksiteCreated={handleWorksiteCreated}
          currentUser={currentUser}
        />
      </View>
    </Modal>
  );
};

// Helper function to calculate responsive modal dimensions
const getResponsiveModalDimensions = () => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  return {
    width: Math.min(screenWidth * 0.95, 700),
    height: screenHeight * 0.9
  };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  inputError: {
    borderColor: '#dc3545',
  },
  fieldError: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    maxHeight: 150,
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
  addNewOption: {
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
    backgroundColor: '#f8f9fa',
  },
  addNewOptionText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
  },
  groupsContainer: {
    marginTop: 8,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ced4da',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  groupLabel: {
    fontSize: 14,
    color: '#495057',
  },
});

export type { AddUserModalProps, FormData, FormErrors, UserGroup };
export default AddUserModal as (props: AddUserModalProps) => React.JSX.Element;