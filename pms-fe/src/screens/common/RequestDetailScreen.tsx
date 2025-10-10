import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import requestService from '../../services/requestService';
import { Request } from '../../types/requests';
import { showError, showConfirm, showSuccess } from '../../utils/platformUtils';

type RequestDetailScreenParams = {
  readonly RequestDetail: { readonly requestId: number };
};

type RequestDetailScreenRouteProp = RouteProp<RequestDetailScreenParams, 'RequestDetail'>;

function RequestDetailScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const route = useRoute<RequestDetailScreenRouteProp>();
  const navigation = useNavigation();
  const { requestId } = route.params;
  
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  const loadRequest = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const requestData = await requestService.getRequest(requestId);
      setRequest(requestData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load request';
      showError(t('messages.error'), errorMessage, () => navigation.goBack());
    } finally {
      setLoading(false);
    }
  }, [requestId, t, navigation]);

  const handleSubmitRequest = useCallback(async (): Promise<void> => {
    if (!request) return;

    showConfirm(
      t('requests.submitRequest'),
      t('requests.submitRequestConfirm'),
      async () => {
        try {
          setSubmitting(true);
          await requestService.submitRequest(request.id);
          showSuccess(
            t('messages.success'),
            t('requests.requestSubmitted'),
            () => navigation.goBack()
          );
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to submit request';
          showError(t('messages.error'), errorMessage);
        } finally {
          setSubmitting(false);
        }
      },
      undefined,
      t('requests.submitButton'),
      t('actions.cancel')
    );
  }, [request, t, navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>{t('requests.loading')}</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t('requests.requestNotFound')}</Text>
      </View>
    );
  }

  const canSubmit = request.status === 'draft';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{request.item}</Text>
        <View style={[styles.statusBadge, { backgroundColor: requestService.getStatusColor(request.status) }]}>
          <Text style={styles.statusText}>{t(`status.${request.status}`)}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('requests.requestDetails')}</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>{t('requests.requestNumber')}:</Text>
            <Text style={styles.value}>{request.request_number}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>{t('requests.item')}:</Text>
            <Text style={styles.value}>{request.item}</Text>
          </View>
          
          {request.description && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>{t('requests.description')}:</Text>
              <Text style={styles.value}>{request.description}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>{t('requests.quantity')}:</Text>
            <Text style={styles.value}>{request.quantity} {request.unit}</Text>
          </View>
          
          {request.category && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>{t('requests.category')}:</Text>
              <Text style={styles.value}>{request.category}</Text>
            </View>
          )}
          
          {request.delivery_address && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>{t('requests.deliveryAddress')}:</Text>
              <Text style={styles.value}>{request.delivery_address}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>{t('requests.reason')}:</Text>
            <Text style={styles.value}>{request.reason}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>{t('requests.createdAt')}:</Text>
            <Text style={styles.value}>{new Date(request.created_at).toLocaleDateString()}</Text>
          </View>
        </View>

        {canSubmit && (
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmitRequest}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? t('requests.submitting') : t('requests.submitForApproval')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center' as const,
    margin: 20,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row' as const,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  label: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 2,
    textAlign: 'right' as const,
  },
  submitButton: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center' as const,
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
} as const);

export default RequestDetailScreen as () => React.JSX.Element;