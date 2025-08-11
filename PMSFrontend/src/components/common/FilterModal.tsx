import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Modal, Portal, Card, Chip, Divider } from 'react-native-paper';

import { Colors, Spacing } from '@/constants/theme';
import { RequestStatus, REQUEST_STATUS_LABELS } from '@/types/requests';

interface FilterOptions {
  statuses: RequestStatus[];
  sortBy: 'created_at' | 'updated_at' | 'item' | 'status';
  sortOrder: 'asc' | 'desc';
}

interface FilterModalProps {
  visible: boolean;
  onDismiss: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onDismiss,
  onApplyFilters,
  currentFilters,
}) => {
  const [selectedStatuses, setSelectedStatuses] = useState<RequestStatus[]>(currentFilters.statuses);
  const [sortBy, setSortBy] = useState(currentFilters.sortBy);
  const [sortOrder, setSortOrder] = useState(currentFilters.sortOrder);

  const allStatuses: RequestStatus[] = [
    'draft', 'pending', 'in_review', 'revision_requested', 'approved',
    'rejected', 'purchasing', 'ordered', 'delivered', 'completed'
  ];

  const sortOptions = [
    { value: 'created_at', label: 'Date Created' },
    { value: 'updated_at', label: 'Last Updated' },
    { value: 'item', label: 'Item Name' },
    { value: 'status', label: 'Status' },
  ] as const;

  const toggleStatus = (status: RequestStatus) => {
    if (selectedStatuses.includes(status)) {
      setSelectedStatuses(selectedStatuses.filter(s => s !== status));
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  const handleApply = () => {
    onApplyFilters({
      statuses: selectedStatuses,
      sortBy,
      sortOrder,
    });
    onDismiss();
  };

  const handleReset = () => {
    setSelectedStatuses([]);
    setSortBy('created_at');
    setSortOrder('desc');
  };

  const getStatusColor = (status: RequestStatus): string => {
    return Colors.status[status];
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <Card>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              Filter & Sort Requests
            </Text>

            {/* Status Filter */}
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Filter by Status
            </Text>
            <View style={styles.chipContainer}>
              {allStatuses.map((status) => (
                <Chip
                  key={status}
                  selected={selectedStatuses.includes(status)}
                  onPress={() => toggleStatus(status)}
                  style={[
                    styles.statusChip,
                    selectedStatuses.includes(status) && {
                      backgroundColor: getStatusColor(status),
                    }
                  ]}
                  textStyle={[
                    styles.chipText,
                    selectedStatuses.includes(status) && {
                      color: Colors.textOnPrimary,
                    }
                  ]}
                >
                  {REQUEST_STATUS_LABELS[status]}
                </Chip>
              ))}
            </View>

            <Divider style={styles.divider} />

            {/* Sort Options */}
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Sort by
            </Text>
            <View style={styles.chipContainer}>
              {sortOptions.map((option) => (
                <Chip
                  key={option.value}
                  selected={sortBy === option.value}
                  onPress={() => setSortBy(option.value)}
                  style={[
                    styles.sortChip,
                    sortBy === option.value && styles.selectedChip
                  ]}
                  textStyle={[
                    styles.chipText,
                    sortBy === option.value && styles.selectedChipText
                  ]}
                >
                  {option.label}
                </Chip>
              ))}
            </View>

            {/* Sort Order */}
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Sort Order
            </Text>
            <View style={styles.chipContainer}>
              <Chip
                selected={sortOrder === 'desc'}
                onPress={() => setSortOrder('desc')}
                style={[
                  styles.sortChip,
                  sortOrder === 'desc' && styles.selectedChip
                ]}
                textStyle={[
                  styles.chipText,
                  sortOrder === 'desc' && styles.selectedChipText
                ]}
              >
                Newest First
              </Chip>
              <Chip
                selected={sortOrder === 'asc'}
                onPress={() => setSortOrder('asc')}
                style={[
                  styles.sortChip,
                  sortOrder === 'asc' && styles.selectedChip
                ]}
                textStyle={[
                  styles.chipText,
                  sortOrder === 'asc' && styles.selectedChipText
                ]}
              >
                Oldest First
              </Chip>
            </View>

            <Divider style={styles.divider} />

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={handleReset}
                style={styles.button}
              >
                Reset
              </Button>
              <Button
                mode="contained"
                onPress={handleApply}
                style={styles.button}
              >
                Apply Filters
              </Button>
            </View>
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: Spacing.lg,
    maxHeight: '80%',
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
    color: Colors.text,
    fontWeight: 'bold',
  },
  sectionTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  statusChip: {
    marginBottom: Spacing.xs,
  },
  sortChip: {
    marginBottom: Spacing.xs,
  },
  selectedChip: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
  },
  selectedChipText: {
    color: Colors.textOnPrimary,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: Spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  button: {
    flex: 1,
  },
});

export default FilterModal;