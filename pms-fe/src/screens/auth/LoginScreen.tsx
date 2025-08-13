import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import LoadingButton from '../../components/common/LoadingButton';
import { LoginRequest } from '../../types/auth';

interface LoginFormData {
  username: string;
  password: string;
}

const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const { authState, login, clearError } = useAuth();
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      const credentials: LoginRequest = {
        username: data.username.trim(),
        password: data.password,
      };
      
      await login(credentials);
      // Navigation will be handled by App.tsx based on auth state
    } catch (error: any) {
      // Error is already handled by the auth context
      // Show additional user feedback if needed
      console.warn('Login error:', error);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      t('auth.forgotPassword'),
      'Password reset requests are handled by your supervisor. Please contact your immediate supervisor to request a password reset.',
      [{ text: 'OK' }]
    );
  };

  // Dev helper function - remove in production
  const quickLogin = async (username: string, password: string) => {
    try {
      clearError();
      console.log(`Quick login as ${username}`);
      await login({ username, password });
    } catch (error) {
      console.error('Quick login failed:', error);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>
            {t('auth.login')} - PMS
          </Text>
          <Text style={styles.subtitle}>
            Procurement Management System
          </Text>
        </View>

        <View style={styles.formContainer}>
          {authState.error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {authState.error}
              </Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.username')}</Text>
            <Controller
              control={control}
              name="username"
              rules={{
                required: t('forms.required'),
                minLength: {
                  value: 2,
                  message: 'Username must be at least 2 characters',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    errors.username && styles.inputError,
                  ]}
                  placeholder={t('auth.username')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  editable={!authState.loading}
                />
              )}
            />
            {errors.username && (
              <Text style={styles.fieldError}>
                {errors.username.message}
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.password')}</Text>
            <Controller
              control={control}
              name="password"
              rules={{
                required: t('forms.required'),
                minLength: {
                  value: 1,
                  message: 'Password is required',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    errors.password && styles.inputError,
                  ]}
                  placeholder={t('auth.password')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  editable={!authState.loading}
                />
              )}
            />
            {errors.password && (
              <Text style={styles.fieldError}>
                {errors.password.message}
              </Text>
            )}
          </View>

          <LoadingButton
            title={t('auth.login')}
            onPress={handleSubmit(onSubmit)}
            loading={authState.loading}
            style={styles.loginButton}
          />

          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={handleForgotPassword}
            disabled={authState.loading}
          >
            <Text style={styles.forgotPasswordText}>
              {t('auth.forgotPassword')}
            </Text>
          </TouchableOpacity>

          {/* Dev Login Helpers - Remove in production */}
          <View style={styles.devSection}>
            <Text style={styles.devTitle}>Dev Quick Login:</Text>
            <View style={styles.devButtons}>
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => quickLogin('admin', 'admin123')}
                disabled={authState.loading}
              >
                <Text style={styles.devButtonText}>Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => quickLogin('ceo', 'ceo123')}
                disabled={authState.loading}
              >
                <Text style={styles.devButtonText}>CEO</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => quickLogin('manager', 'manager123')}
                disabled={authState.loading}
              >
                <Text style={styles.devButtonText}>Manager</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => quickLogin('engineer', 'engineer123')}
                disabled={authState.loading}
              >
                <Text style={styles.devButtonText}>Engineer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 50,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  fieldError: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  forgotPasswordText: {
    color: '#007bff',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  devSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f1f3f4',
    borderRadius: 8,
    borderColor: '#e9ecef',
    borderWidth: 1,
  },
  devTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 12,
    textAlign: 'center',
  },
  devButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  devButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
    minWidth: '22%',
    alignItems: 'center',
  },
  devButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default LoginScreen;