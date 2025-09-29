import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Request } from '../../types/requests';

interface RequestListItemProps {
  request: Request;
  onPress?: (request: Request) => void;
}

function RequestListItem({ request, onPress }: RequestListItemProps): React.JSX.Element {
  const { t } = useTranslation();

  const handlePress = useCallback(() => {
    onPress?.(request);
  }, [onPress, request]);

  const getStatusBadgeStyle = useCallback((status: string) => {
    const baseStyle = { ...styles.statusBadge };
    switch (status) {
      case 'draft':
        return { ...baseStyle, backgroundColor: '#6c757d' };
      case 'pending':
        return { ...baseStyle, backgroundColor: '#ffc107' };
      case 'in_review':
        return { ...baseStyle, backgroundColor: '#17a2b8' };
      case 'revision_requested':
        return { ...baseStyle, backgroundColor: '#fd7e14' };
      case 'approved':
        return { ...baseStyle, backgroundColor: '#28a745' };
      case 'rejected':
        return { ...baseStyle, backgroundColor: '#dc3545' };
      case 'purchasing':
        return { ...baseStyle, backgroundColor: '#6f42c1' };
      case 'ordered':
        return { ...baseStyle, backgroundColor: '#20c997' };
      case 'delivered':
        return { ...baseStyle, backgroundColor: '#007bff' };
      case 'completed':
        return { ...baseStyle, backgroundColor: '#28a745' };
      default:
        return { ...baseStyle, backgroundColor: '#6c757d' };
    }
  }, []);

  return (
    <TouchableOpacity
      style={styles.requestItem}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.requestHeader}>
        <Text style={styles.requestNumber}>{request.request_number}</Text>
        <View style={getStatusBadgeStyle(request.status)}>
          <Text style={styles.statusText}>{request.status_display}</Text>
        </View>
      </View>

      <Text style={styles.requestTitle}>{request.item}</Text>

      <View style={styles.requestDetails}>
        <Text style={styles.detailText}>
          {t('requests.quantity')}: {request.quantity} {request.unit_display}
        </Text>
        {request.category && (
          <Text style={styles.detailText}>
            {t('requests.category')}: {request.category}
          </Text>
        )}
      </View>

      <View style={styles.requestFooter}>
        <Text style={styles.dateText}>
          {new Date(request.created_at).toLocaleDateString()}
        </Text>
        {request.revision_count > 0 && (
          <Text style={styles.revisionText}>
            Rev. {request.revision_count}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  requestItem: {
    backgroundColor: '#ffffff',
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  requestDetails: {
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#adb5bd',
  },
  revisionText: {
    fontSize: 12,
    color: '#fd7e14',
    fontWeight: '500',
  },
});

export default RequestListItem;