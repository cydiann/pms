import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Request } from '../../types/requests';

interface StatusTimelineProps {
  readonly request: Request;
  readonly style?: object;
}

function StatusTimeline({ request, style }: StatusTimelineProps): React.JSX.Element {
  const { t } = useTranslation();

  const getDaysElapsed = (dateString?: string): number => {
    if (!dateString) return 0;
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getProgressPercentage = (): number => {
    const statusProgress: Record<string, number> = {
      draft: 10,
      pending: 25,
      in_review: 35,
      revision_requested: 30,
      approved: 50,
      purchasing: 65,
      ordered: 80,
      delivered: 95,
      completed: 100,
      rejected: 100,
    };
    return statusProgress[request.status] || 0;
  };

  const getTimelineColor = (): string => {
    if (request.status === 'rejected') return '#dc3545';
    if (request.status === 'revision_requested') return '#fd7e14';
    if (request.status === 'completed') return '#28a745';
    return '#007bff';
  };

  const daysElapsed = getDaysElapsed(request.submitted_at || request.created_at);
  const progress = getProgressPercentage();
  const color = getTimelineColor();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${progress}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{progress}%</Text>
      </View>

      <View style={styles.infoContainer}>
        {request.submitted_at ? (
          <Text style={styles.daysText}>
            {daysElapsed === 0
              ? t('requests.timeline.today')
              : daysElapsed === 1
              ? t('requests.timeline.yesterday')
              : t('requests.timeline.daysAgo', { count: daysElapsed })}
          </Text>
        ) : (
          <Text style={styles.daysText}>{t('requests.timeline.notSubmitted')}</Text>
        )}

        {request.revision_count > 0 && (
          <Text style={styles.revisionBadge}>
            {t('requests.revision')} {request.revision_count}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  progressBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6c757d',
    minWidth: 35,
    textAlign: 'right',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  daysText: {
    fontSize: 11,
    color: '#6c757d',
  },
  revisionBadge: {
    fontSize: 10,
    color: '#fd7e14',
    fontWeight: '600',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

export default StatusTimeline;
