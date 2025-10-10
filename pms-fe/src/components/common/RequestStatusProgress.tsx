import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RequestStatus } from '../../types/requests';

interface RequestStatusProgressProps {
  readonly currentStatus: RequestStatus | string;
  readonly style?: object;
}

interface ProgressStep {
  key: string;
  label: string;
  icon: string;
}

function RequestStatusProgress({ currentStatus, style }: RequestStatusProgressProps): React.JSX.Element {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();

  // Define the main workflow steps
  const mainSteps: ProgressStep[] = [
    { key: 'draft', label: t('status.draft'), icon: '📝' },
    { key: 'pending', label: t('status.pending'), icon: '⏳' },
    { key: 'approved', label: t('status.approved'), icon: '✅' },
    { key: 'purchasing', label: t('status.purchasing'), icon: '🛒' },
    { key: 'ordered', label: t('status.ordered'), icon: '📦' },
    { key: 'delivered', label: t('status.delivered'), icon: '🚚' },
    { key: 'completed', label: t('status.completed'), icon: '🎉' },
  ];
  const totalSteps = mainSteps.length;

  const getCurrentStepIndex = (): number => {
    const stepMap: Record<string, number> = {
      draft: 0,
      pending: 1,
      in_review: 1,
      revision_requested: 1,
      approved: 2,
      purchasing: 3,
      ordered: 4,
      delivered: 5,
      completed: 6,
    };
    return stepMap[currentStatus] ?? 0;
  };

  const getStepStatus = (stepIndex: number): 'completed' | 'current' | 'pending' => {
    const currentIndex = getCurrentStepIndex();
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStepColor = (status: 'completed' | 'current' | 'pending'): string => {
    switch (status) {
      case 'completed':
        return '#28a745';
      case 'current':
        return '#007bff';
      case 'pending':
      default:
        return '#e9ecef';
    }
  };

  // Check if request is in special state
  const isRejected = currentStatus === 'rejected';
  const isRevisionRequested = currentStatus === 'revision_requested';

  const scrollViewRef = useRef<ScrollView>(null);

  const currentIndex = useMemo(() => getCurrentStepIndex(), [currentStatus]);

  const stepWidth = useMemo(() => {
    const horizontalPadding = 48; // approximate modal padding + card gutters
    const available = Math.max(windowWidth - horizontalPadding, 320);
    const calculated = available / totalSteps;
    return Math.min(84, Math.max(64, calculated));
  }, [windowWidth, totalSteps]);

  const connectorWidth = useMemo(() => Math.max(stepWidth * 0.35, 14), [stepWidth]);
  const connectorSpacing = useMemo(() => Math.max(stepWidth * 0.12, 6), [stepWidth]);
  const maxCharsPerLine = useMemo(() => Math.max(Math.floor(stepWidth / 6.5), 6), [stepWidth]);

  const formatLabel = useCallback(
    (label: string): string => {
      if (!label) return '';

      const breakLongWord = (word: string): string[] => {
        if (word.length <= maxCharsPerLine) {
          return [word];
        }
        const segments: string[] = [];
        const minSegment = Math.max(3, Math.floor(maxCharsPerLine / 2));
        let start = 0;

        while (start < word.length) {
          let end = Math.min(start + maxCharsPerLine, word.length);
          const remaining = word.length - end;

          if (remaining > 0 && remaining < minSegment && start < word.length - minSegment) {
            end = Math.max(start + minSegment, word.length - minSegment);
          }

          segments.push(word.slice(start, end));
          start = end;
        }

        return segments;
      };

      const words = label.split(' ').filter(Boolean);
      if (words.length <= 1) {
        return breakLongWord(label).join('\n');
      }

      const lines: string[] = [];
      let currentLine = '';

      words.forEach(word => {
        const segments = breakLongWord(word);

        segments.forEach((segment, segmentIndex) => {
          const candidate = currentLine ? `${currentLine} ${segment}` : segment;
          if (candidate.length > maxCharsPerLine && currentLine) {
            lines.push(currentLine);
            currentLine = segment;
          } else {
            currentLine = candidate;
          }

          if (segmentIndex < segments.length - 1) {
            lines.push(currentLine);
            currentLine = '';
          }
        });
      });

      if (currentLine) {
        lines.push(currentLine);
      }

      if (lines.length > 4) {
        const condensed = [...lines.slice(0, 3), lines.slice(3).join(' ')];
        return condensed.join('\n');
      }

      return lines.join('\n');
    },
    [maxCharsPerLine],
  );

  const scrollToCurrentStep = useCallback(
    (options?: { animated?: boolean; layoutWidth?: number; contentWidth?: number }) => {
      const { animated = true, layoutWidth, contentWidth } = options ?? {};
      const scrollViewWidth = layoutWidth ?? windowWidth;
      const stepSpan = stepWidth + connectorWidth + connectorSpacing;
      const calculatedOffset = stepSpan * currentIndex - scrollViewWidth / 2 + stepWidth / 2;
      const estimatedContentWidth =
        contentWidth ??
        stepWidth * totalSteps + (totalSteps - 1) * (connectorWidth + connectorSpacing);
      const maxOffset = Math.max(estimatedContentWidth - scrollViewWidth, 0);
      const clampedOffset = Math.max(0, Math.min(calculatedOffset, maxOffset));
      scrollViewRef.current?.scrollTo({ x: clampedOffset, animated });
    },
    [
      connectorSpacing,
      connectorWidth,
      currentIndex,
      stepWidth,
      totalSteps,
      windowWidth,
    ],
  );

  useEffect(() => {
    scrollToCurrentStep({ animated: false });
  }, [scrollToCurrentStep, currentIndex]);

  return (
    <View style={[styles.container, style]}>
      {isRejected && (
        <View style={styles.specialState}>
          <Text style={styles.specialStateIcon}>❌</Text>
          <Text style={styles.specialStateText}>{t('status.rejected')}</Text>
        </View>
      )}

      {isRevisionRequested && (
        <View style={[styles.specialState, { backgroundColor: '#fff3cd' }]}>
          <Text style={styles.specialStateIcon}>🔄</Text>
          <Text style={[styles.specialStateText, { color: '#856404' }]}>
            {t('status.revision_requested')}
          </Text>
        </View>
      )}

      {!isRejected && (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={event =>
            scrollToCurrentStep({
              animated: false,
              layoutWidth: event?.nativeEvent?.layout?.width,
            })
          }
          onContentSizeChange={(width: number) =>
            scrollToCurrentStep({
              animated: false,
              contentWidth: width,
            })
          }
          contentContainerStyle={styles.stepsScrollContent}
        >
          <View style={styles.stepsContainer}>
            {mainSteps.map((step, index) => {
              const stepStatus = getStepStatus(index);
              const color = getStepColor(stepStatus);
              const formattedLabel = formatLabel(step.label);

              return (
                <React.Fragment key={step.key}>
                  <View style={[styles.stepItem, { width: stepWidth }]}>
                    <View
                      style={[
                        styles.stepCircle,
                        { backgroundColor: color },
                        stepStatus === 'current' && styles.stepCircleCurrent,
                      ]}
                    >
                      <Text style={styles.stepIcon}>{step.icon}</Text>
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        stepStatus === 'current' && styles.stepLabelCurrent,
                        stepStatus === 'pending' && styles.stepLabelPending,
                      ]}
                      numberOfLines={4}
                      ellipsizeMode="clip"
                    >
                      {formattedLabel}
                    </Text>
                  </View>

                  {index < mainSteps.length - 1 && (
                    <View
                      style={[
                        styles.connector,
                        {
                          backgroundColor: stepStatus === 'completed' ? '#28a745' : '#e9ecef',
                          width: connectorWidth,
                          marginHorizontal: connectorSpacing / 2,
                        },
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  specialState: {
    backgroundColor: '#f8d7da',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  specialStateIcon: {
    fontSize: 24,
  },
  specialStateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#721c24',
  },
  stepsScrollContent: {
    paddingHorizontal: 2,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleCurrent: {
    borderWidth: 3,
    borderColor: '#0056b3',
  },
  stepIcon: {
    fontSize: 18,
  },
  stepLabel: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    color: '#6c757d',
    paddingHorizontal: 4,
  },
  stepLabelCurrent: {
    fontWeight: 'bold',
    color: '#007bff',
  },
  stepLabelPending: {
    color: '#adb5bd',
  },
  connector: {
    height: 2,
    alignSelf: 'center',
    marginTop: -14,
    backgroundColor: '#e9ecef',
  },
});

export default RequestStatusProgress;
