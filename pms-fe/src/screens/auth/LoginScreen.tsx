import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import LoadingButton from '../../components/common/LoadingButton';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import { LoginRequest } from '../../types/auth';
import { API_CONFIG } from '../../constants/api';
import apiClient from '../../services/apiClient';

interface LoginFormData {
  username: string;
  password: string;
}

function LoginScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { authState, login, clearError } = useAuth();

  const [backendModalVisible, setBackendModalVisible] = useState(false);
  const [currentBackendUrl, setCurrentBackendUrl] = useState(API_CONFIG.BASE_URL);
  const [backendUrlInput, setBackendUrlInput] = useState(API_CONFIG.BASE_URL);
  const [backendUrlError, setBackendUrlError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    // reset, // Unused - removed
  } = useForm<LoginFormData>({
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = useCallback(async (data: LoginFormData): Promise<void> => {
    try {
      clearError();
      const credentials: LoginRequest = {
        username: data.username.trim(),
        password: data.password,
      };
      
      await login(credentials);
      // Navigation will be handled by App.tsx based on auth state
    } catch (error: unknown) {
      // Error is already handled by the auth context
      // Show additional user feedback if needed
      console.warn('Login error:', error);
    }
  }, [login, clearError]);

  const [showForgotPasswordInfo, setShowForgotPasswordInfo] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadBackendUrl = async (): Promise<void> => {
      try {
        const storedBaseUrl = await apiClient.getStoredBaseUrl();
        if (!isMounted) {
          return;
        }
        if (storedBaseUrl) {
          setCurrentBackendUrl(storedBaseUrl);
          setBackendUrlInput(storedBaseUrl);
        } else {
          setCurrentBackendUrl(API_CONFIG.BASE_URL);
          setBackendUrlInput(API_CONFIG.BASE_URL);
        }
      } catch (error) {
        console.warn('Failed to load backend URL.', error);
      }
    };

    void loadBackendUrl();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleForgotPassword = useCallback((): void => {
    setShowForgotPasswordInfo(!showForgotPasswordInfo);
  }, [showForgotPasswordInfo]);

  const handleOpenBackendModal = useCallback((): void => {
    setBackendUrlError(null);
    setBackendUrlInput(currentBackendUrl);
    setBackendModalVisible(true);
  }, [currentBackendUrl]);

  const handleCloseBackendModal = useCallback((): void => {
    setBackendModalVisible(false);
    setBackendUrlError(null);
  }, []);

  const handleSaveBackendUrl = useCallback(async (): Promise<void> => {
    const trimmedUrl = backendUrlInput.trim();

    if (!trimmedUrl) {
      setBackendUrlError('Backend URL is required.');
      return;
    }

    try {
      // Validate using URL constructor to ensure protocol + host exist
      // Accepts values like http(s)://domain:port
      // Throws if invalid
      new URL(trimmedUrl);
    } catch {
      setBackendUrlError('Please enter a valid URL including protocol (e.g. https://api.example.com).');
      return;
    }

    try {
      await apiClient.setBaseUrl(trimmedUrl);
      setCurrentBackendUrl(trimmedUrl);
      setBackendModalVisible(false);
      setBackendUrlError(null);
      console.log('✅ Backend URL updated:', trimmedUrl);
    } catch (error) {
      console.warn('Failed to persist backend URL override.', error);
      setBackendUrlError('Failed to save backend URL. Please try again.');
    }
  }, [backendUrlInput]);

  const handleResetBackendUrl = useCallback(async (): Promise<void> => {
    try {
      await apiClient.resetBaseUrl();
      setCurrentBackendUrl(API_CONFIG.BASE_URL);
      setBackendUrlInput(API_CONFIG.BASE_URL);
      setBackendUrlError(null);
      console.log('✅ Backend URL reset to default:', API_CONFIG.BASE_URL);
    } catch (error) {
      console.warn('Failed to reset backend URL.', error);
      setBackendUrlError('Failed to reset backend URL. Please try again.');
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#f8f9fa" barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backendButton}
            onPress={handleOpenBackendModal}
            accessibilityRole="button"
            accessibilityLabel="Configure backend API URL"
          >
            <Text style={styles.backendButtonText}>Backend</Text>
          </TouchableOpacity>
          <LanguageSwitcher variant="light" />
        </View>
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

          {showForgotPasswordInfo && (
            <View style={styles.infoMessageContainer}>
              <Text style={styles.infoMessageText}>
                {t('auth.forgotPasswordMessage')}
              </Text>
            </View>
          )}

        </View>
      </ScrollView>
      <Modal
        visible={backendModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseBackendModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Backend Configuration</Text>
            <Text style={styles.modalDescription}>
              Enter the backend API base URL provided by your administrator. This will be used for all network requests.
            </Text>
            <Text style={styles.modalLabel}>Current URL</Text>
            <Text style={styles.modalValue}>{currentBackendUrl}</Text>
            <Text style={styles.modalLabel}>New URL</Text>
            <TextInput
              value={backendUrlInput}
              onChangeText={setBackendUrlInput}
              placeholder="https://your-backend.example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={[
                styles.modalInput,
                backendUrlError && styles.modalInputError,
              ]}
            />
            {backendUrlError && (
              <Text style={styles.modalErrorText}>{backendUrlError}</Text>
            )}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalResetButton]}
                onPress={handleResetBackendUrl}
              >
                <Text style={styles.modalResetButtonText}>Reset Default</Text>
              </TouchableOpacity>
              <View style={styles.modalButtonSpacer} />
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={handleCloseBackendModal}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleSaveBackendUrl}
              >
                <Text style={styles.modalSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  topBar: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backendButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    backgroundColor: '#343a40',
    marginRight: 12,
  },
  backendButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
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
  infoMessageContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  infoMessageText: {
    color: '#495057',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#212529',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginTop: 12,
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 13,
    color: '#495057',
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    padding: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    marginTop: 4,
  },
  modalInputError: {
    borderColor: '#dc3545',
  },
  modalErrorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 8,
  },
  modalButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  modalResetButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  modalResetButtonText: {
    color: '#343a40',
    fontWeight: '600',
  },
  modalButtonSpacer: {
    flex: 1,
  },
  modalCancelButton: {
    backgroundColor: '#e9ecef',
    marginRight: 10,
  },
  modalCancelButtonText: {
    color: '#495057',
    fontWeight: '600',
  },
  modalSaveButton: {
    backgroundColor: '#0d6efd',
  },
  modalSaveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default LoginScreen as () => React.JSX.Element;
