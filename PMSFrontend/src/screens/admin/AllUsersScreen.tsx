import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';

import { Colors, Spacing } from '@/constants/theme';

const AllUsersScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            User Management
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            This screen will show user management features for administrators.
          </Text>
          <Text variant="bodyMedium" style={styles.features}>
            Features to be implemented:
            {'\n'}• All users list with roles
            {'\n'}• User search and filtering
            {'\n'}• Role assignments
            {'\n'}• Supervisor hierarchy view
            {'\n'}• User activity logs
            {'\n'}• Password reset management
            {'\n'}• "View as user" functionality
            {'\n'}• User statistics
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

export default AllUsersScreen;