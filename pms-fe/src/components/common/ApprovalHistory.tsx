import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import requestService from '../../services/requestService';
import { ApprovalHistory as ApprovalHistoryType } from '../../types/requests';

interface ApprovalHistoryProps {
  readonly requestId: number;
  readonly style?: object;
}

function ApprovalHistory({ requestId, style }: ApprovalHistoryProps): React.JSX.Element {
  const { t } = useTranslation();
  const [history, setHistory] = useState<ApprovalHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [requestId]);

  const loadHistory = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await requestService.getRequestHistory(requestId);
      setHistory(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string): string => {
    const colorMap: Record<string, string> = {
      submitted: '#17a2b8',
      approved: '#28a745',
      rejected: '#dc3545',
      revision_requested: '#fd7e14',
      revised: '#6f42c1',
      final_approved: '#28a745',
      assigned_purchasing: '#6f42c1',
      ordered: '#20c997',
      delivered: '#007bff',
      completed: '#28a745',
    };
    return colorMap[action] || '#6c757d';
  };

  const getActionIcon = (action: string): string => {
    const iconMap: Record<string, string> = {
      submitted: '📤',
      approved: '✅',
      rejected: '❌',
      revision_requested: '🔄',
      revised: '📝',
      final_approved: '✅',
      assigned_purchasing: '🛒',
      ordered: '📦',
      delivered: '🚚',
      completed: '🎉',
    };
    return iconMap[action] || '📋';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <Text style={styles.emptyText}>{t('requests.noHistoryAvailable')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, style]} nestedScrollEnabled={true}>
      <Text style={styles.title}>{t('requests.approvalHistory')}</Text>

      <View style={styles.timeline}>
        {history.map((item, index) => (
          <View key={item.id} style={styles.timelineItem}>
            <View style={styles.timelineIconContainer}>
              <View style={[styles.timelineIcon, { backgroundColor: getActionColor(item.action) }]}>
                <Text style={styles.timelineIconText}>{getActionIcon(item.action)}</Text>
              </View>
              {index < history.length - 1 && <View style={styles.timelineLine} />}
            </View>

            <View style={styles.timelineContent}>
              <View style={styles.timelineHeader}>
                <Text style={styles.timelineAction}>{t(`actions.${item.action}`)}</Text>
                <Text style={styles.timelineDate}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>

              <Text style={styles.timelineUser}>
                {t('requests.by')}: {item.user_name}
              </Text>

              {item.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>{t('requests.notes')}:</Text>
                  <Text style={styles.notesText}>{item.notes}</Text>
                </View>
              )}

              {item.review_notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>{t('requests.reviewNotes')}:</Text>
                  <Text style={styles.notesText}>{item.review_notes}</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  timeline: {
    flex: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  timelineIconText: {
    fontSize: 20,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#e9ecef',
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineAction: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  timelineDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  timelineUser: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  notesContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#212529',
    lineHeight: 20,
  },
});

export default ApprovalHistory;
