import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Avatar } from 'react-native-paper';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import { logoutUser } from '@/store/slices/authSlice';

import { Colors, Spacing, Shadow } from '@/constants/theme';
import { getInitials } from '@/utils/helpers';

const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);

  const handleLogout = async () => {
    await dispatch(logoutUser());
  };

  if (!user) {
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Info Card */}
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text 
            size={80} 
            label={getInitials(user.full_name)} 
            style={styles.avatar}
          />
          <Text variant="headlineSmall" style={styles.name}>
            {user.full_name}
          </Text>
          <Text variant="bodyMedium" style={styles.username}>
            @{user.username}
          </Text>
          {user.email && (
            <Text variant="bodyMedium" style={styles.email}>
              {user.email}
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Details Card */}
      <Card style={styles.detailsCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Account Information
          </Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role:</Text>
            <Text style={styles.infoValue}>
              {user.is_superuser ? 'Administrator' : user.is_staff ? 'Supervisor' : 'Employee'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member since:</Text>
            <Text style={styles.infoValue}>
              {new Date(user.created_at).toLocaleDateString()}
            </Text>
          </View>

          {user.worksite && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Worksite ID:</Text>
              <Text style={styles.infoValue}>{user.worksite}</Text>
            </View>
          )}

          {user.supervisor && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Supervisor ID:</Text>
              <Text style={styles.infoValue}>{user.supervisor}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Actions Card */}
      <Card style={styles.actionsCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Account Actions
          </Text>
          
          <Button
            mode="outlined"
            onPress={() => {}}
            style={styles.actionButton}
            disabled
          >
            Change Password (Coming Soon)
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => {}}
            style={styles.actionButton}
            disabled
          >
            Update Profile (Coming Soon)
          </Button>
          
          <Button
            mode="contained"
            onPress={handleLogout}
            style={[styles.actionButton, styles.logoutButton]}
            buttonColor={Colors.error}
          >
            Logout
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
    paddingBottom: Spacing.xl,
  },
  profileCard: {
    marginBottom: Spacing.md,
    ...Shadow.medium,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  avatar: {
    backgroundColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  name: {
    color: Colors.text,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  username: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  email: {
    color: Colors.textSecondary,
  },
  detailsCard: {
    marginBottom: Spacing.md,
    ...Shadow.small,
  },
  actionsCard: {
    ...Shadow.small,
  },
  sectionTitle: {
    color: Colors.text,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    marginBottom: Spacing.sm,
  },
  logoutButton: {
    marginTop: Spacing.md,
  },
});

export default ProfileScreen;