import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import userService from '../../services/userService';

const ProfileScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { authState, logout } = useAuth();
  const { user } = authState;
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleLogout = async () => {
    await logout();
  };

  const handleChangePassword = () => {
    setShowChangePassword(true);
  };

  const handleNotifications = () => {
    setShowNotificationSettings(true);
  };

  const enableAllNotifications = () => {
    setShowNotificationSettings(false);
    Alert.alert(t('messages.success'), t('profile.notificationsEnabled'));
  };

  const disableAllNotifications = () => {
    setShowNotificationSettings(false);
    Alert.alert(t('messages.success'), t('profile.notificationsDisabled'));
  };

  const cancelNotificationSettings = () => {
    setShowNotificationSettings(false);
  };

  const submitPasswordChange = () => {
    // Validate passwords
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert(t('messages.error'), t('profile.fillAllFields'));
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert(t('messages.error'), t('profile.passwordsDoNotMatch'));
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      Alert.alert(t('messages.error'), t('forms.passwordTooShort'));
      return;
    }

    // TODO: Implement actual password change API call
    Alert.alert(
      t('messages.success'), 
      t('profile.passwordChangeSuccess'),
      [{
        text: t('actions.ok'),
        onPress: () => {
          setShowChangePassword(false);
          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        }
      }]
    );
  };

  const cancelPasswordChange = () => {
    setShowChangePassword(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('profile.title')}
        </Text>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.sectionTitle}>
          {t('profile.userInformation')}
        </Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>{t('profile.firstName')}:</Text>
          <Text style={styles.value}>{user?.first_name}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>{t('profile.lastName')}:</Text>
          <Text style={styles.value}>{user?.last_name}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>{t('profile.username')}:</Text>
          <Text style={styles.value}>{user?.username}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>{t('profile.role')}:</Text>
          <Text style={styles.value}>
            {user?.is_superuser ? t('profile.admin') : 
             user?.is_supervisor ? t('profile.supervisor') : 
             t('profile.employee')}
          </Text>
        </View>
      </View>

      {/* Groups Section */}
      {user?.groups && user.groups.length > 0 && (
        <View style={styles.userInfo}>
          <Text style={styles.sectionTitle}>
            {t('userManagement.groups')}
          </Text>
          <View style={styles.groupsContainer}>
            {user.groups.map(group => (
              <View key={group.id} style={styles.groupItem}>
                <Text style={styles.groupName}>
                  {userService.translateGroupName(group.name, i18n.language)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Permissions Section */}
      {user?.permissions && user.permissions.length > 0 && (
        <View style={styles.userInfo}>
          <Text style={styles.sectionTitle}>
            {t('userManagement.permissions')}
          </Text>
          <View style={styles.permissionsContainer}>
            {userService.formatUserPermissions(user.permissions, t).map((permission, index) => (
              <View key={index} style={styles.permissionItem}>
                <Text style={styles.permissionText}>{permission}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <Text style={styles.sectionTitle}>
          {t('profile.actions')}
        </Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
          <Text style={styles.actionButtonText}>
            {t('profile.changePassword')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleNotifications}>
          <Text style={styles.actionButtonText}>
            {t('profile.notifications')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={[styles.actionButtonText, styles.logoutButtonText]}>
            {t('auth.logout')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePassword}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelPasswordChange}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t('profile.changePassword')}</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder={t('profile.currentPassword')}
              value={passwordForm.currentPassword}
              onChangeText={(text) => setPasswordForm(prev => ({ ...prev, currentPassword: text }))}
              secureTextEntry
              placeholderTextColor="#6c757d"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder={t('profile.newPassword')}
              value={passwordForm.newPassword}
              onChangeText={(text) => setPasswordForm(prev => ({ ...prev, newPassword: text }))}
              secureTextEntry
              placeholderTextColor="#6c757d"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder={t('profile.confirmNewPassword')}
              value={passwordForm.confirmPassword}
              onChangeText={(text) => setPasswordForm(prev => ({ ...prev, confirmPassword: text }))}
              secureTextEntry
              placeholderTextColor="#6c757d"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={cancelPasswordChange}
              >
                <Text style={styles.cancelButtonText}>{t('actions.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]} 
                onPress={submitPasswordChange}
              >
                <Text style={styles.submitButtonText}>{t('actions.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Settings Modal */}
      <Modal
        visible={showNotificationSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelNotificationSettings}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t('profile.notifications')}</Text>
            <Text style={styles.modalSubtitle}>{t('profile.notificationSettings')}</Text>
            
            <View style={styles.notificationButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.enableButton]} 
                onPress={enableAllNotifications}
              >
                <Text style={styles.enableButtonText}>{t('profile.enableAll')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.disableButton]} 
                onPress={disableAllNotifications}
              >
                <Text style={styles.disableButtonText}>{t('profile.disableAll')}</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton, styles.fullWidthButton]} 
              onPress={cancelNotificationSettings}
            >
              <Text style={styles.cancelButtonText}>{t('actions.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  },
  userInfo: {
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
  actions: {
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
    paddingVertical: 12,
    borderBottomColor: '#e9ecef',
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 16,
    color: '#495057',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#2c3e50',
  },
  actionButton: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderColor: '#e9ecef',
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#495057',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
    marginTop: 16,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#495057',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
    borderWidth: 1,
  },
  submitButton: {
    backgroundColor: '#007bff',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
  },
  notificationButtons: {
    marginBottom: 16,
  },
  enableButton: {
    backgroundColor: '#28a745',
    marginBottom: 12,
  },
  disableButton: {
    backgroundColor: '#dc3545',
    marginBottom: 12,
  },
  enableButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disableButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  fullWidthButton: {
    marginHorizontal: 0,
  },
  groupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
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
  permissionsContainer: {
    marginTop: 8,
  },
  permissionItem: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  permissionText: {
    fontSize: 11,
    color: '#6c757d',
  },
});

export default ProfileScreen;