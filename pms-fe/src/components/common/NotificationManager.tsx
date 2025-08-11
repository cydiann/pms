import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Text, Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectNotifications, removeNotification } from '@/store/slices/appSlice';
import { Colors, Spacing, Shadow } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NOTIFICATION_HEIGHT = 80;

interface NotificationItemProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  type,
  message,
  duration = 3000,
  onDismiss,
}) => {
  const slideAnim = React.useRef(new Animated.Value(-SCREEN_WIDTH)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const getIcon = () => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success': return Colors.success;
      case 'error': return Colors.error;
      case 'warning': return Colors.warning;
      case 'info': return Colors.info;
      default: return Colors.info;
    }
  };

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(id);
    });
  };

  return (
    <Animated.View
      style={[
        styles.notification,
        {
          transform: [{ translateX: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <Card
        style={[
          styles.card,
          { borderLeftColor: getColor() },
        ]}
        onPress={handleDismiss}
      >
        <View style={styles.content}>
          <Icon
            name={getIcon()}
            size={24}
            color={getColor()}
            style={styles.icon}
          />
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
      </Card>
    </Animated.View>
  );
};

const NotificationManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);

  const handleDismiss = (id: string) => {
    dispatch(removeNotification(id));
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {notifications.map((notification, index) => (
        <NotificationItem
          key={notification.id}
          {...notification}
          onDismiss={handleDismiss}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50, // Below status bar
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: Spacing.md,
  },
  notification: {
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    ...Shadow.medium,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
});

export default NotificationManager;