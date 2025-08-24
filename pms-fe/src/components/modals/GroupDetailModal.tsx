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
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import userService from '../../services/userService';
import { ExtendedUser } from '../../types/users';
import { showAlert, showConfirm, showError, showSuccess } from '../../utils/platformUtils';

interface GroupDetailModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: number | null;
  onGroupUpdated?: () => void;
  currentUser: ExtendedUser;
}

interface GroupDetail {
  id: number;
  name: string;
  users: Array<{
    id: number;
    username: string;
    full_name: string;
  }>;
  permissions: Array<{
    id: number;
    name: string;
    codename: string;
  }>;
}

interface Permission {
  id: number;
  name: string;
  codename: string;
  content_type: string;
}

interface FormErrors {
  name?: string;
  general?: string;
}

const GroupDetailModal: React.FC<GroupDetailModalProps> = ({
  visible,
  onClose,
  groupId,
  onGroupUpdated,
  currentUser,
}) => {
  console.log('GroupDetailModal: Rendered with props - visible:', visible, 'groupId:', groupId);
  
  const { t } = useTranslation();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const [groupName, setGroupName] = useState('');
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  useEffect(() => {
    console.log('GroupDetailModal: Effect triggered - visible:', visible, 'groupId:', groupId);
    if (visible && groupId) {
      loadGroup();
      loadAllPermissions();
    }
  }, [visible, groupId]);

  const loadGroup = async () => {
    if (!groupId) {
      console.log('GroupDetailModal: No groupId provided');
      return;
    }
    
    try {
      console.log('GroupDetailModal: Loading group with ID:', groupId);
      setLoading(true);
      const groupData = await userService.getGroup(groupId);
      console.log('GroupDetailModal: Group data loaded:', groupData);
      
      setGroup(groupData);
      setGroupName(groupData.name);
      setSelectedPermissions(new Set(groupData.permissions.map(p => p.id)));
    } catch (error: any) {
      console.error('GroupDetailModal: Failed to load group:', error);
      showError(
        t('messages.error'),
        error.message || 'Failed to load group details'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadAllPermissions = async () => {
    try {
      console.log('GroupDetailModal: Loading all permissions...');
      setPermissionsLoading(true);
      const permissions = await userService.getPermissions();
      console.log('GroupDetailModal: All permissions loaded:', permissions.length);
      setAllPermissions(permissions);
    } catch (error: any) {
      console.error('GroupDetailModal: Failed to load permissions:', error);
      setAllPermissions([]);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!groupName.trim()) {
      newErrors.name = t('groupManagement.validation.nameRequired');
    } else if (groupName.trim().length < 2) {
      newErrors.name = t('groupManagement.validation.nameTooShort');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!group) return;

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      
      // Update group name if changed
      if (groupName.trim() !== group.name) {
        const updatedGroup = await userService.updateGroup(group.id, { name: groupName.trim() });
        setGroup(prev => prev ? { ...prev, name: updatedGroup.name } : null);
      }

      // Update group permissions
      const currentPermissionIds = new Set(group.permissions.map(p => p.id));
      if (!setsEqual(selectedPermissions, currentPermissionIds)) {
        await userService.manageGroupPermissions(group.id, {
          action: 'set',
          permission_ids: Array.from(selectedPermissions)
        });
      }

      setEditing(false);
      onGroupUpdated?.();
      showSuccess(t('messages.success'), t('groupManagement.groupUpdated'));
      
      // Reload group data to get updated info
      await loadGroup();
    } catch (error: any) {
      showError(
        t('messages.error'),
        error.message || t('groupManagement.updateGroupError')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!group) return;

    showConfirm(
      t('groupManagement.deleteGroup'),
      t('groupManagement.deleteGroupConfirm', { name: group.name }),
      async () => {
        try {
          await userService.deleteGroup(group.id);
          onGroupUpdated?.();
          onClose();
          showSuccess(t('messages.success'), t('groupManagement.groupDeleted'));
        } catch (error: any) {
          showError(
            t('messages.error'),
            error.message || t('groupManagement.deleteGroupError')
          );
        }
      },
      undefined,
      t('actions.delete'),
      t('actions.cancel'),
      true
    );
  };

  const togglePermission = (permissionId: number) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  };

  const setsEqual = (a: Set<number>, b: Set<number>): boolean => {
    return a.size === b.size && [...a].every(x => b.has(x));
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

  const canEdit = currentUser.is_superuser;
  const canDelete = currentUser.is_superuser && group?.users.length === 0; // Can only delete empty groups

  const renderViewMode = () => {
    if (!group) return null;

    return (
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('groupManagement.groupInfo')}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('groupManagement.groupName')}:</Text>
            <Text style={styles.value}>{group.name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('groupManagement.memberCount')}:</Text>
            <Text style={styles.value}>
              {group.users.length} {group.users.length === 1 ? t('groupManagement.member') : t('groupManagement.members')}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('groupManagement.permissionCount')}:</Text>
            <Text style={styles.value}>
              {group.permissions.length} {group.permissions.length === 1 ? t('groupManagement.permission') : t('groupManagement.permissions')}
            </Text>
          </View>
        </View>

        {group.users.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('groupManagement.groupMembers')}</Text>
            {group.users.map(user => (
              <View key={user.id} style={styles.userItem}>
                <Text style={styles.userName}>{user.full_name}</Text>
                <Text style={styles.userUsername}>@{user.username}</Text>
              </View>
            ))}
          </View>
        )}

        {group.permissions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('groupManagement.groupPermissions')}</Text>
            {group.permissions.map(permission => (
              <View key={permission.id} style={styles.permissionItem}>
                <Text style={styles.permissionName}>{permission.name}</Text>
                <Text style={styles.permissionCode}>{permission.codename}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderEditMode = () => {
    return (
      <ScrollView style={styles.content}>
        {errors.general && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors.general}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('groupManagement.groupInfo')}</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('groupManagement.groupName')} *</Text>
            <TextInput
              style={[styles.formInput, errors.name && styles.inputError]}
              value={groupName}
              onChangeText={(text) => {
                setGroupName(text);
                if (errors.name) {
                  setErrors(prev => ({ ...prev, name: undefined }));
                }
              }}
              placeholder={t('groupManagement.groupNamePlaceholder')}
            />
            {errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('groupManagement.managePermissions')}</Text>
          
          {permissionsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007bff" />
              <Text style={styles.loadingText}>{t('groupManagement.loadingPermissions')}</Text>
            </View>
          ) : (
            Object.keys(groupedPermissions).map(contentType => (
              <View key={contentType} style={styles.permissionGroup}>
                <Text style={styles.permissionGroupTitle}>
                  {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
                </Text>
                {groupedPermissions[contentType].map(permission => (
                  <View key={permission.id} style={styles.permissionToggle}>
                    <View style={styles.permissionInfo}>
                      <Text style={styles.permissionToggleName}>{permission.name}</Text>
                      <Text style={styles.permissionToggleCode}>{permission.codename}</Text>
                    </View>
                    <Switch
                      value={selectedPermissions.has(permission.id)}
                      onValueChange={() => togglePermission(permission.id)}
                      trackColor={{ false: '#d1ecf1', true: '#007bff' }}
                      thumbColor={selectedPermissions.has(permission.id) ? '#fff' : '#6c757d'}
                    />
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
              {editing ? t('groupManagement.editGroup') : t('groupManagement.groupDetails')}
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
              <Text style={styles.loadingText}>{t('groupManagement.loadingGroup')}</Text>
            </View>
          ) : editing ? (
            renderEditMode()
          ) : (
            renderViewMode()
          )}

          {canDelete && !editing && group && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>{t('groupManagement.deleteGroup')}</Text>
              </TouchableOpacity>
            </View>
          )}
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
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    flex: 2,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2c3e50',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
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
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    textAlign: 'right',
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
  },
  inputError: {
    borderColor: '#dc3545',
  },
  fieldError: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    flex: 1,
  },
  userUsername: {
    fontSize: 12,
    color: '#6c757d',
  },
  permissionItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
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
  permissionGroup: {
    marginBottom: 16,
  },
  permissionGroupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
    textTransform: 'capitalize',
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
  permissionToggleName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  permissionToggleCode: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
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
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GroupDetailModal;