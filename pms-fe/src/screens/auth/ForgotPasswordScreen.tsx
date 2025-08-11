import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { requestPasswordReset, selectIsLoading } from '@/store/slices/authSlice';
import { showSuccessNotification, showErrorNotification } from '@/store/slices/appSlice';

import { Colors, Spacing, Dimensions } from '@/constants/theme';
import { VALIDATION_RULES, SUCCESS_MESSAGES } from '@/constants/app';
import { PasswordResetRequest } from '@/types/auth';

interface ForgotPasswordFormData {
  username: string;
  reason?: string;
}

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectIsLoading);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ForgotPasswordFormData>({
    defaultValues: {
      username: '',
      reason: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      const requestData: PasswordResetRequest = {
        username: data.username.trim(),
        reason: data.reason?.trim(),
      };

      const result = await dispatch(requestPasswordReset(requestData));
      
      if (requestPasswordReset.fulfilled.match(result)) {
        dispatch(showSuccessNotification(SUCCESS_MESSAGES.PASSWORD_RESET_REQUESTED));
        reset();
        navigation.goBack();
      } else {
        dispatch(showErrorNotification(
          result.payload as string || 'Failed to request password reset.'
        ));
      }
    } catch (err) {
      dispatch(showErrorNotification('An unexpected error occurred.'));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Text variant="headlineSmall" style={styles.title}>
            Reset Password
          </Text>
          
          <Text variant="bodyMedium" style={styles.description}>
            Enter your username to request a password reset. Your supervisor will be notified and can provide you with a temporary password.
          </Text>

          <Controller
            control={control}
            name="username"
            rules={VALIDATION_RULES.USERNAME}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                mode="outlined"
                label="Username"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.username}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            )}
          />
          {errors.username && (
            <Text style={styles.errorText}>{errors.username.message}</Text>
          )}

          <Controller
            control={control}
            name="reason"
            rules={{
              maxLength: {
                value: 200,
                message: 'Reason must not exceed 200 characters',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                mode="outlined"
                label="Reason (Optional)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.reason}
                style={styles.input}
                multiline
                numberOfLines={3}
                placeholder="Why do you need to reset your password?"
                returnKeyType="done"
              />
            )}
          />
          {errors.reason && (
            <Text style={styles.errorText}>{errors.reason.message}</Text>
          )}

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
          >
            Request Password Reset
          </Button>

          <Text variant="bodySmall" style={styles.note}>
            <Text style={styles.noteHighlight}>Note:</Text> You will need to contact your supervisor in person to receive the temporary password once approved.
          </Text>
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
    padding: Spacing.lg,
    flexGrow: 1,
  },
  card: {
    marginTop: Spacing.lg,
  },
  cardContent: {
    padding: Spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.md,
    color: Colors.text,
  },
  description: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  input: {
    marginBottom: Spacing.md,
    minHeight: Dimensions.input.height,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
  },
  submitButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  submitButtonContent: {
    height: Dimensions.button.height,
  },
  note: {
    textAlign: 'center',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  noteHighlight: {
    fontWeight: 'bold',
    color: Colors.text,
  },
});

export default ForgotPasswordScreen;