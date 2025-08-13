import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';

const TeamRequestsScreen: React.FC = () => {
  const { t } = useTranslation();

  // TODO: Replace with actual data from API
  const teamRequests: any[] = [];

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {t('supervisor.noTeamRequestsTitle')}
      </Text>
      <Text style={styles.emptyStateMessage}>
        {t('supervisor.noTeamRequestsMessage')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <Text style={styles.filtersText}>
          Team request filters will be implemented here...
        </Text>
      </View>
      
      <FlatList
        data={teamRequests}
        renderItem={({ item }) => (
          <View style={styles.requestItem}>
            {/* TODO: Implement team request item component */}
            <Text>Team request item will be rendered here</Text>
          </View>
        )}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={teamRequests.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  filters: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomColor: '#e9ecef',
    borderBottomWidth: 1,
  },
  filtersText: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
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
  requestItem: {
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

export default TeamRequestsScreen;