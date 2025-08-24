import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import userService from '../../services/userService';
import { ExtendedUser, UpdateUserDto } from '../../types/users';
import { showAlert, showConfirm, showError, showSuccess } from '../../utils/platformUtils';

interface UserDetailModalProps {
  visible: boolean;
  onClose: () => void;
  userId: number | null;
  onUserUpdated?: () => void;
  currentUser: ExtendedUser;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({
  visible,
  onClose,
  userId,
  onUserUpdated,
  currentUser,
}) => {
  console.log('UserDetailModal: Rendered with props - visible:', visible, 'userId:', userId, 'currentUser:', currentUser?.username);
  
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availablePermissions, setAvailablePermissions] = useState<Array<{
    id: number;
    name: string;
    codename: string;
    content_type?: string;
    app_label?: string;
  }>>([]);
  const [managingPermissions, setManagingPermissions] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Array<{
    id: number;
    username: string;
    full_name: string;
  }>>([]);
  const [showSupervisorDropdown, setShowSupervisorDropdown] = useState(false);
  const [formData, setFormData] = useState<UpdateUserDto>({
    id: 0,
    username: '',
    first_name: '',
    last_name: '',
    worksite: undefined,
    supervisor: undefined,
    is_superuser: false,
    is_active: true,
    groups: [],
  });

  useEffect(() => {
    console.log('UserDetailModal: Effect triggered - visible:', visible, 'userId:', userId);
    if (visible && userId && (!user || user.id !== userId)) {
      // Only reload if we're opening the modal or switching to a different user
      // Reset modal state when switching users
      setEditing(false);
      setManagingPermissions(false);
      loadUser();
      if (currentUser.is_superuser) {
        loadAvailablePermissions();
      }
      // Always load available users for supervisor assignment
      loadAvailableUsers();
    }
  }, [visible, userId]);

  const loadAvailablePermissions = async () => {
    try {
      const permissions = await userService.getAvailablePermissions();
      setAvailablePermissions(permissions);
    } catch (error) {
      console.error('Failed to load available permissions:', error);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      console.log('UserDetailModal: Loading available users...');
      const response = await userService.getUsers({});
      console.log('UserDetailModal: Users response:', response);
      const mappedUsers = response.results.map(user => ({
        id: user.id,
        username: user.username,
        full_name: user.full_name
      }));
      console.log('UserDetailModal: Mapped users:', mappedUsers);
      setAvailableUsers(mappedUsers);
    } catch (error) {
      console.error('Failed to load available users:', error);
    }
  };

  const loadUser = async () => {
    if (!userId) {
      console.log('UserDetailModal: No userId provided');
      return;
    }
    
    try {
      console.log('UserDetailModal: Loading user with ID:', userId);
      setLoading(true);
      const userData = await userService.getUser(userId);
      console.log('UserDetailModal: User data loaded:', userData);
      
      setUser(userData);
      setFormData({
        id: userData.id,
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        worksite: userData.worksite ?? undefined,
        supervisor: userData.supervisor ?? undefined,
        is_superuser: userData.is_superuser,
        is_active: userData.is_active,
        groups: userData.groups?.map(g => g.id) || [],
      });
    } catch (error: any) {
      console.error('UserDetailModal: Failed to load user:', error);
      console.error('UserDetailModal: Error details:', JSON.stringify(error, null, 2));
      
      showError(
        t('messages.error'),
        `${error.message || t('userManagement.loadUsersError')}\n\nCheck console for details.`
      );
    } finally {
      setLoading(false);
    }
  };

  // Silent refresh for updating combined permissions without showing loading spinner
  const loadUserDataSilently = async () => {
    if (!userId || !user) return;
    
    try {
      const userData = await userService.getUser(userId);
      setUser(prevUser => {
        if (!prevUser) return userData;
        return {
          ...prevUser,
          permissions: userData.permissions, // Update combined permissions
          user_permissions: userData.user_permissions, // Ensure consistency
        };
      });
    } catch (error) {
      console.error('Silent user data refresh failed:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const updatedUser = await userService.updateUser(user.id, formData);
      setUser(updatedUser);
      setEditing(false);
      // Notify parent for major changes (user info, status, etc.) that affect the user list
      onUserUpdated?.();
      showSuccess(t('messages.success'), t('userManagement.userUpdated'));
    } catch (error: any) {
      showError(
        t('messages.error'),
        error.message || t('userManagement.updateUserError')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!user) return;

    showConfirm(
      t('userManagement.deleteUser'),
      t('userManagement.deleteUserConfirm', { name: user.full_name }),
      async () => {
        try {
          await userService.deleteUser(user.id);
          onUserUpdated?.();
          onClose();
          showSuccess(t('messages.success'), t('userManagement.userDeleted'));
        } catch (error: any) {
          showError(
            t('messages.error'),
            error.message || t('userManagement.deleteUserError')
          );
        }
      },
      undefined,
      t('actions.delete'),
      t('actions.cancel'),
      true
    );
  };

  const handlePermissionToggle = async (permissionId: number, hasPermission: boolean) => {
    if (!user) return;

    try {
      const action = hasPermission ? 'remove' : 'add';
      const response = await userService.manageUserPermissions(user.id, {
        action,
        permission_ids: [permissionId]
      });
      
      // Update user state with returned data and refresh combined permissions
      setUser(prevUser => {
        if (!prevUser) return prevUser;
        return {
          ...prevUser,
          user_permissions: response.user_permissions || [],
          // Also update combined permissions if backend provides them
          permissions: response.permissions || prevUser.permissions
        };
      });
      
      // If backend doesn't provide combined permissions, we need to refresh them
      if (!response.permissions) {
        // Silently refresh user data to get updated combined permissions
        loadUserDataSilently();
      }
      
      console.log('UserDetailModal: Permission toggled successfully, updated user permissions:', response.user_permissions);
      
      // More specific success message
      const permissionName = availablePermissions.find(p => p.id === permissionId)?.name || 'Permission';
      const actionText = hasPermission ? 'removed from' : 'added to';
      showSuccess(
        'Permission Updated', 
        `${permissionName} ${actionText} ${user.full_name}`
      );
    } catch (error: any) {
      console.error('Permission toggle error:', error);
      showError(t('messages.error'), error.message || t('userManagement.permissionUpdateError'));
      // Only reload on error to restore correct state
      await loadUser();
    }
  };

  const canEdit = user ? userService.canUserEdit(user, currentUser) : false;
  const canDelete = user ? userService.canUserDelete(user, currentUser) : false;
  const canManagePermissions = currentUser.is_superuser && user && user.id !== currentUser.id;

  const renderViewMode = () => {
    if (!user) return null;

    return (
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.userInformation')}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('profile.firstName')}:</Text>
            <Text style={styles.value}>{user.first_name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('profile.lastName')}:</Text>
            <Text style={styles.value}>{user.last_name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('profile.username')}:</Text>
            <Text style={styles.value}>{user.username}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('userManagement.role')}:</Text>
            <Text style={styles.value}>{userService.getUserRoleDisplay(user, i18n.language)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('userManagement.worksite')}:</Text>
            <Text style={styles.value}>{userService.getWorksiteName(user)}</Text>
          </View>
          
          {user.supervisor_name && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('userManagement.supervisor')}:</Text>
              <Text style={styles.value}>{user.supervisor_name}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('userManagement.active')}:</Text>
            <View style={[styles.statusBadge, { backgroundColor: userService.getUserStatusColor(user) }]}>
              <Text style={styles.statusText}>
                {user.is_active ? t('userManagement.active') : t('userManagement.inactive')}
              </Text>
            </View>
          </View>
        </View>

        {user.groups && user.groups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userManagement.groups')}</Text>
            {user.groups.map(group => (
              <View key={group.id} style={styles.groupItem}>
                <Text style={styles.groupName}>
                  {userService.translateGroupName(group.name, i18n.language)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {user.permissions && user.permissions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('userManagement.permissions')}</Text>
            {userService.formatUserPermissions(user.permissions, t).map((perm, index) => (
              <View key={index} style={styles.permissionItem}>
                <Text style={styles.permissionText}>{perm}</Text>
              </View>
            ))}
          </View>
        )}

        {canManagePermissions && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('userManagement.individualPermissions')}</Text>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => setManagingPermissions(!managingPermissions)}
              >
                <Text style={styles.manageButtonText}>
                  {managingPermissions ? t('actions.cancel') : t('userManagement.managePermissions')}
                </Text>
              </TouchableOpacity>
            </View>
            
            {managingPermissions && (
              <View style={styles.permissionsList}>
                {availablePermissions
                  .filter(perm => perm.app_label === 'requisition' || perm.app_label === 'auth')
                  .sort((a, b) => {
                    // First, sort by whether user has the permission (user's permissions first)
                    const hasA = user.user_permissions?.some(up => up.id === a.id) || false;
                    const hasB = user.user_permissions?.some(up => up.id === b.id) || false;
                    
                    if (hasA && !hasB) return -1; // A has permission, B doesn't - A comes first
                    if (!hasA && hasB) return 1;  // B has permission, A doesn't - B comes first
                    
                    // If both have same permission status, sort alphabetically by display name
                    const translationKeyA = `permissions.${a.codename}`;
                    const translatedNameA = t(translationKeyA);
                    const displayNameA = translatedNameA !== translationKeyA ? translatedNameA : a.name;
                    
                    const translationKeyB = `permissions.${b.codename}`;
                    const translatedNameB = t(translationKeyB);
                    const displayNameB = translatedNameB !== translationKeyB ? translatedNameB : b.name;
                    
                    return displayNameA.localeCompare(displayNameB);
                  })
                  .map(permission => {
                    const hasPermission = user.user_permissions?.some(up => up.id === permission.id) || false;
                    
                    // Try to get translation, fallback to formatted name
                    const translationKey = `permissions.${permission.codename}`;
                    const translatedName = t(translationKey);
                    const displayName = translatedName !== translationKey 
                      ? translatedName 
                      : permission.name;
                    
                    return (
                      <View key={permission.id} style={styles.permissionRow}>
                        <View style={styles.permissionInfo}>
                          <Text style={styles.permissionName}>{displayName}</Text>
                          <Text style={styles.permissionCode}>{permission.codename}</Text>
                        </View>
                        <Switch
                          value={hasPermission}
                          onValueChange={() => handlePermissionToggle(permission.id, hasPermission)}
                        />
                      </View>
                    );
                  })
                }
              </View>
            )}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderEditMode = () => {
    return (
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('userManagement.editUser')}</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('profile.firstName')}</Text>
            <TextInput
              style={styles.formInput}
              value={formData.first_name}
              onChangeText={(value) => setFormData(prev => ({ ...prev, first_name: value }))}
              placeholder={t('profile.firstName')}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('profile.lastName')}</Text>
            <TextInput
              style={styles.formInput}
              value={formData.last_name}
              onChangeText={(value) => setFormData(prev => ({ ...prev, last_name: value }))}
              placeholder={t('profile.lastName')}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('profile.username')}</Text>
            <TextInput
              style={styles.formInput}
              value={formData.username}
              onChangeText={(value) => setFormData(prev => ({ ...prev, username: value }))}
              placeholder={t('profile.username')}
            />
          </View>

          {currentUser.is_superuser && (
            <View style={styles.formGroup}>
              <View style={styles.sectionHeader}>
                <Text style={styles.formLabel}>{t('userManagement.supervisor')}</Text>
                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={() => setShowSupervisorDropdown(!showSupervisorDropdown)}
                >
                  <Text style={styles.manageButtonText}>
                    {showSupervisorDropdown ? t('actions.cancel') : t('userManagement.selectSupervisor')}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.currentSupervisor}>
                <Text style={styles.currentSupervisorText}>
                  {t('userManagement.currentSupervisor')}: {formData.supervisor 
                    ? availableUsers.find(u => u.id === formData.supervisor)?.full_name || t('userManagement.supervisorNotFound')
                    : t('userManagement.noSupervisor')
                  }
                </Text>
              </View>
              
              {showSupervisorDropdown && (
                <View style={[
                  styles.supervisorList,
                  {
                    // Calculate height: (users + "No Supervisor" option) * 49px (padding + border)
                    maxHeight: (availableUsers.filter(u => u.id !== formData.id).length + 1) * 49,
                  }
                ]}>
                  <TouchableOpacity
                    style={[styles.supervisorOption, !formData.supervisor && styles.selectedOption]}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, supervisor: undefined }));
                      setShowSupervisorDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.supervisorOptionText,
                      !formData.supervisor && styles.selectedOptionText
                    ]}>
                      {t('userManagement.noSupervisor')}
                    </Text>
                  </TouchableOpacity>
                  
                  {availableUsers
                    .filter(u => u.id !== formData.id)
                    .map(user => (
                      <TouchableOpacity
                        key={user.id}
                        style={[
                          styles.supervisorOption,
                          formData.supervisor === user.id && styles.selectedOption
                        ]}
                        onPress={() => {
                          setFormData(prev => ({ ...prev, supervisor: user.id }));
                          setShowSupervisorDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.supervisorOptionText,
                          formData.supervisor === user.id && styles.selectedOptionText
                        ]}>
                          {user.full_name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  }
                </View>
              )}
            </View>
          )}

          {currentUser.is_superuser && (
            <>
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.formLabel}>{t('profile.admin')}</Text>
                  <Switch
                    value={formData.is_superuser}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, is_superuser: value }))}
                  />
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.formLabel}>{t('userManagement.active')}</Text>
                  <Switch
                    value={formData.is_active}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, is_active: value }))}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    );
  };

  console.log('UserDetailModal: About to render Modal component - visible:', visible);

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
            {editing ? t('userManagement.editUser') : t('userManagement.userDetails')}
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
            <Text style={styles.loadingText}>{t('userManagement.loadingUsers')}</Text>
          </View>
        ) : editing ? (
          renderEditMode()
        ) : (
          renderViewMode()
        )}

        {canDelete && !editing && user && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>{t('userManagement.deleteUser')}</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
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
    alignItems: 'center',
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  groupItem: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  groupName: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  permissionItem: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  permissionText: {
    fontSize: 11,
    color: '#6c757d',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  manageButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  permissionsList: {
    maxHeight: 300,
  },
  permissionRow: {
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
    fontSize: 14,
    backgroundColor: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
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
  supervisorSelector: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supervisorText: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },
  supervisorArrow: {
    fontSize: 12,
    color: '#6c757d',
  },
  currentSupervisor: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  currentSupervisorText: {
    fontSize: 14,
    color: '#495057',
  },
  supervisorList: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 6,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  supervisorOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  supervisorOptionText: {
    fontSize: 14,
    color: '#495057',
  },
  selectedOption: {
    backgroundColor: '#e3f2fd',
  },
  selectedOptionText: {
    color: '#1976d2',
    fontWeight: '600',
  },
});

export default UserDetailModal;