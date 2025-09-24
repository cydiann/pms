import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';

interface LoadingButtonProps {
  readonly title: string;
  readonly onPress: () => void | Promise<void>;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly style?: ViewStyle | ViewStyle[];
  readonly textStyle?: TextStyle | TextStyle[];
}

function LoadingButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
}: LoadingButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isDisabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={[styles.buttonText, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    minHeight: 56,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center' as const,
  },
} as const);

export type { LoadingButtonProps };
export default LoadingButton as (props: LoadingButtonProps) => React.JSX.Element;