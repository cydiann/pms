import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

const UserManagementScreen: React.FC = () => {
  const { t } = useTranslation();

  // TODO: Replace with actual data from API
  const users = [];

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {t('admin.noUsersTitle')}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {t('admin.noUsersMessage')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>
            {t('admin.addUser')}
          </Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={users}
        renderItem={({ item }) => (
          <View style={styles.userItem}>
            {/* TODO: Implement user item component */}
            <Text>User item will be rendered here</Text>
          </View>
        )}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={users.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomColor: '#e9ecef',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
  },
  userItem: {
    backgroundColor: '#fff',
    margin: 8,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

export default UserManagementScreen;