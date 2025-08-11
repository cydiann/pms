import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginUser, selectIsLoading, selectAuthError } from '@/store/slices/authSlice';
import { showErrorNotification, showSuccessNotification } from '@/store/slices/appSlice';

import { Colors, Spacing, Dimensions } from '@/constants/theme';
import { SCREENS, APP_INFO, VALIDATION_RULES } from '@/constants/app';
import { LoginRequest } from '@/types/auth';

interface LoginFormData {
  username: string;
  password: string;
}

const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  
  const isLoading = useAppSelector(selectIsLoading);
  const error = useAppSelector(selectAuthError);

  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const loginData: LoginRequest = {
        username: data.username.trim(),
        password: data.password,
      };

      const result = await dispatch(loginUser(loginData));
      
      if (loginUser.fulfilled.match(result)) {
        dispatch(showSuccessNotification('Welcome back!'));
      } else {
        dispatch(showErrorNotification(
          result.payload as string || 'Login failed. Please try again.'
        ));
      }
    } catch (err) {
      dispatch(showErrorNotification('An unexpected error occurred.'));
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate(SCREENS.FORGOT_PASSWORD as never);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* App Logo/Title */}
        <View style={styles.header}>
          <Text variant="headlineLarge" style={styles.title}>
            {APP_INFO.NAME}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {APP_INFO.DESCRIPTION}
          </Text>
        </View>

        {/* Login Form */}
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="headlineSmall" style={styles.formTitle}>
              Sign In
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
              name="password"
              rules={VALIDATION_RULES.PASSWORD}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={!!errors.password}
                  secureTextEntry={!showPassword}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
                />
              )}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password.message}</Text>
            )}

            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
              contentStyle={styles.loginButtonContent}
            >
              Sign In
            </Button>

            <Button
              mode="text"
              onPress={handleForgotPassword}
              disabled={isLoading}
              style={styles.forgotButton}
            >
              Forgot Password?
            </Button>
          </Card.Content>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.footerText}>
            Version {APP_INFO.VERSION}
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    color: Colors.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    marginBottom: Spacing.xl,
  },
  cardContent: {
    padding: Spacing.lg,
  },
  formTitle: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
    color: Colors.text,
  },
  input: {
    marginBottom: Spacing.md,
    height: Dimensions.input.height,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
  },
  loginButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  loginButtonContent: {
    height: Dimensions.button.height,
  },
  forgotButton: {
    marginTop: Spacing.sm,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textSecondary,
  },
});

export default LoginScreen;