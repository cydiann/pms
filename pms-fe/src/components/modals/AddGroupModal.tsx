import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import userService from '../../services/userService';
import { ExtendedUser } from '../../types/users';

interface AddGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onGroupCreated?: (group: any) => void;
  currentUser: ExtendedUser;
}

interface Permission {
  id: number;
  name: string;
  codename: string;
  content_type: string;
}

interface FormData {
  name: string;
  permissions: Set<number>;
}

interface FormErrors {
  name?: string;
  general?: string;
}

const AddGroupModal: React.FC<AddGroupModalProps> = ({
  visible,
  onClose,
  onGroupCreated,
  currentUser,
}) => {
  console.log('AddGroupModal: Rendered with visible:', visible);
  
  const { t } = useTranslation();
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    permissions: new Set(),
  });

  // Validation state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data loading state
  const [loading, setLoading] = useState(false);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

  // Load initial data when modal opens
  useEffect(() => {
    if (visible) {
      console.log('AddGroupModal: Modal opened, loading permissions...');
      loadPermissions();
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setFormData({
      name: '',
      permissions: new Set(),
    });
    setErrors({});
  };

  const loadPermissions = async () => {
    try {
      setLoading(true);
      console.log('AddGroupModal: Loading all permissions...');
      
      const permissions = await userService.getPermissions();
      console.log('AddGroupModal: Loaded permissions:', permissions?.length || 0);
      
      setAllPermissions(permissions || []);
      
    } catch (error: any) {
      console.error('AddGroupModal: Failed to load permissions:', error);
      Alert.alert(
        t('messages.error'),
        'Failed to load permissions. Please try again.'
      );
      setAllPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = t('groupManagement.validation.nameRequired');
    } else if (formData.name.trim().length < 2) {
      newErrors.name = t('groupManagement.validation.nameTooShort');
    } else if (!/^[a-zA-Z0-9\s_-]+$/.test(formData.name.trim())) {
      newErrors.name = t('groupManagement.validation.nameInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('AddGroupModal: Submit attempted');
    
    if (!validateForm()) {
      console.log('AddGroupModal: Validation failed:', errors);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Create group
      const groupData = {
        name: formData.name.trim(),
      };

      console.log('AddGroupModal: Creating group with data:', groupData);

      const newGroup = await userService.createGroup(groupData);
      console.log('AddGroupModal: Group created successfully:', newGroup);

      // Assign permissions if any selected
      if (formData.permissions.size > 0) {
        console.log('AddGroupModal: Assigning permissions to group...');
        await userService.manageGroupPermissions(newGroup.id, {
          action: 'set',
          permission_ids: Array.from(formData.permissions)
        });
      }

      Alert.alert(
        t('groupManagement.success.title'),
        t('groupManagement.success.message', { name: newGroup.name })
      );

      // Reset form and close modal
      resetForm();
      onGroupCreated?.(newGroup);
      onClose();

    } catch (error: any) {
      console.error('AddGroupModal: Failed to create group:', error);
      
      // Handle specific validation errors from backend
      if (error.status === 400 && error.data) {
        const backendErrors: FormErrors = {};
        
        if (error.data.name) {
          backendErrors.name = Array.isArray(error.data.name) 
            ? error.data.name[0] 
            : error.data.name;
        }
        
        if (Object.keys(backendErrors).length > 0) {
          setErrors(backendErrors);
          return;
        }
      }
      
      // Generic error handling
      setErrors({ 
        general: error.message || t('groupManagement.error.createFailed')
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

  const togglePermission = (permissionId: number) => {
    setFormData(prev => {
      const newPermissions = new Set(prev.permissions);
      if (newPermissions.has(permissionId)) {
        newPermissions.delete(permissionId);
      } else {
        newPermissions.add(permissionId);
      }
      return { ...prev, permissions: newPermissions };
    });
  };

  // Group permissions by content type for better organization
  const groupedPermissions = allPermissions.reduce((acc, permission) => {
    const contentType = permission.content_type;
    if (!acc[contentType]) {
      acc[contentType] = [];
    }
    acc[contentType].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const selectAllPermissionsForType = (contentType: string, select: boolean) => {
    const typePermissions = groupedPermissions[contentType];
    setFormData(prev => {
      const newPermissions = new Set(prev.permissions);
      typePermissions.forEach(permission => {
        if (select) {
          newPermissions.add(permission.id);
        } else {
          newPermissions.delete(permission.id);
        }
      });
      return { ...prev, permissions: newPermissions };
    });
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
            <Text style={styles.loadingText}>{t('groupManagement.loadingPermissions')}</Text>
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
            
            <Text style={styles.headerTitle}>{t('groupManagement.addGroup')}</Text>
            
            <TouchableOpacity 
              style={[styles.saveButton, isSubmitting && styles.disabledButton]} 
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.saveButtonText}>
                {isSubmitting ? t('groupManagement.creating') : t('actions.save')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {errors.general && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}

            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('groupManagement.basicInfo')}</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('groupManagement.groupName')} *</Text>
                <TextInput
                  style={[styles.formInput, errors.name && styles.inputError]}
                  value={formData.name}
                  onChangeText={(value) => updateFormField('name', value)}
                  placeholder={t('groupManagement.groupNamePlaceholder')}
                  autoCapitalize="words"
                />
                {errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}
              </View>
            </View>

            {/* Permissions Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('groupManagement.assignPermissions')}</Text>
              <Text style={styles.helperText}>{t('groupManagement.assignPermissionsHelp')}</Text>
              
              {Object.keys(groupedPermissions).map(contentType => {
                const typePermissions = groupedPermissions[contentType];
                const selectedInType = typePermissions.filter(p => formData.permissions.has(p.id)).length;
                const allSelected = selectedInType === typePermissions.length;
                const someSelected = selectedInType > 0 && selectedInType < typePermissions.length;

                return (
                  <View key={contentType} style={styles.permissionGroup}>
                    <View style={styles.permissionGroupHeader}>
                      <Text style={styles.permissionGroupTitle}>
                        {contentType.charAt(0).toUpperCase() + contentType.slice(1)} ({selectedInType}/{typePermissions.length})
                      </Text>
                      <TouchableOpacity
                        style={styles.selectAllButton}
                        onPress={() => selectAllPermissionsForType(contentType, !allSelected)}
                      >
                        <Text style={styles.selectAllText}>
                          {allSelected ? t('groupManagement.deselectAll') : t('groupManagement.selectAll')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    {typePermissions.map(permission => (
                      <View key={permission.id} style={styles.permissionToggle}>
                        <View style={styles.permissionInfo}>
                          <Text style={styles.permissionName}>{permission.name}</Text>
                          <Text style={styles.permissionCode}>{permission.codename}</Text>
                        </View>
                        <Switch
                          value={formData.permissions.has(permission.id)}
                          onValueChange={() => togglePermission(permission.id)}
                          trackColor={{ false: '#d1ecf1', true: '#007bff' }}
                          thumbColor={formData.permissions.has(permission.id) ? '#fff' : '#6c757d'}
                        />
                      </View>
                    ))}
                  </View>
                );
              })}

              {Object.keys(groupedPermissions).length === 0 && (
                <Text style={styles.noPermissionsText}>{t('groupManagement.noPermissionsAvailable')}</Text>
              )}
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summaryTitle}>{t('groupManagement.summary')}</Text>
              <Text style={styles.summaryText}>
                {t('groupManagement.selectedPermissions', { count: formData.permissions.size })}
              </Text>
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
    maxWidth: 700,
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
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
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
  helperText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 16,
  },
  permissionGroup: {
    marginBottom: 20,
  },
  permissionGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionGroupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
  },
  selectAllText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
  permissionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  permissionInfo: {
    flex: 1,
  },
  permissionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  permissionCode: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  noPermissionsText: {
    textAlign: 'center',
    color: '#6c757d',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  summarySection: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#1976d2',
  },
});

export default AddGroupModal;