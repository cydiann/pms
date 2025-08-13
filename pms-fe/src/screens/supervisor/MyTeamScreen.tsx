import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';

const MyTeamScreen: React.FC = () => {
  const { t } = useTranslation();

  // TODO: Replace with actual data from API
  const teamMembers: any[] = [];

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {t('supervisor.noTeamMembersTitle')}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {t('supervisor.noTeamMembersMessage')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {t('supervisor.myTeamTitle')}
        </Text>
        <Text style={styles.headerSubtitle}>
          {t('supervisor.teamMemberCount', { count: teamMembers.length })}
        </Text>
      </View>
      
      <FlatList
        data={teamMembers}
        renderItem={({ item }) => (
          <View style={styles.memberItem}>
            {/* TODO: Implement team member item component */}
            <Text>Team member item will be rendered here</Text>
          </View>
        )}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={teamMembers.length === 0 ? styles.emptyContainer : undefined}
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
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
  memberItem: {
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

export default MyTeamScreen;