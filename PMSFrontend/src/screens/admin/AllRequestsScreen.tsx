import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';

import { Colors, Spacing } from '@/constants/theme';

const AllRequestsScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            All System Requests
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            This screen will show all requests across the entire system for administrators.
          </Text>
          <Text variant="bodyMedium" style={styles.features}>
            Features to be implemented:
            {'\n'}• System-wide request view
            {'\n'}• Advanced filtering and search
            {'\n'}• Worksite-based grouping
            {'\n'}• Status analytics
            {'\n'}• Export capabilities
            {'\n'}• Bulk operations
            {'\n'}• Request reassignment
          </Text>
          <Button mode="outlined" style={styles.button}>
            Coming Soon
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  card: {
    marginTop: Spacing.md,
  },
  title: {
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  description: {
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  features: {
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  button: {
    marginTop: Spacing.md,
  },
});

export default AllRequestsScreen;