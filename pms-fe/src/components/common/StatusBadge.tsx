import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { RequestStatus } from '../../types/requests';

interface StatusBadgeProps {
  readonly status: RequestStatus | string;
  readonly size?: 'small' | 'medium' | 'large';
  readonly showIcon?: boolean;
  readonly pulse?: boolean;
  readonly style?: ViewStyle;
}

function StatusBadge({
  status,
  size = 'medium',
  showIcon = true,
  pulse = false,
  style,
}: StatusBadgeProps): React.JSX.Element {

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      draft: '#6c757d',
      pending: '#ffc107',
      in_review: '#17a2b8',
      revision_requested: '#fd7e14',
      approved: '#28a745',
      rejected: '#dc3545',
      purchasing: '#6f42c1',
      ordered: '#20c997',
      delivered: '#007bff',
      completed: '#28a745',
    };
    return colorMap[status] || '#6c757d';
  };

  const getStatusIcon = (status: string): string => {
    const iconMap: Record<string, string> = {
      draft: '📝',
      pending: '⏳',
      in_review: '👀',
      revision_requested: '🔄',
      approved: '✅',
      rejected: '❌',
      purchasing: '🛒',
      ordered: '📦',
      delivered: '🚚',
      completed: '🎉',
    };
    return iconMap[status] || '📋';
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle; icon: TextStyle } => {
    switch (size) {
      case 'small':
        return {
          container: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10 },
          text: { fontSize: 10 },
          icon: { fontSize: 10 },
        };
      case 'large':
        return {
          container: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
          text: { fontSize: 14 },
          icon: { fontSize: 16 },
        };
      case 'medium':
      default:
        return {
          container: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
          text: { fontSize: 12 },
          icon: { fontSize: 12 },
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const backgroundColor = getStatusColor(status);
  const icon = getStatusIcon(status);

  return (
    <View
      style={[
        styles.container,
        sizeStyles.container,
        { backgroundColor },
        pulse && styles.pulse,
        style,
      ]}
    >
      {showIcon && (
        <Text style={[styles.icon, sizeStyles.icon]}>{icon}</Text>
      )}
      <Text style={[styles.text, sizeStyles.text]}>
        {status.replace(/_/g, ' ').toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  icon: {
    color: '#fff',
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  pulse: {
    // Animation would be added here with react-native-reanimated
    opacity: 0.9,
  },
});

export default StatusBadge;
