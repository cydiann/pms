import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';

const ProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const { authState, logout } = useAuth();
  const { user } = authState;

  const handleLogout = async () => {
    await logout();
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

      <View style={styles.actions}>
        <Text style={styles.sectionTitle}>
          {t('profile.actions')}
        </Text>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>
            {t('profile.changePassword')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>
            {t('profile.notifications')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>
            {t('profile.language')}
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
});

export default ProfileScreen;