import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Card, Chip, Menu, Divider } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { Colors, Spacing, Dimensions } from '@/constants/theme';
import { VALIDATION_RULES, REQUEST_CATEGORIES } from '@/constants/app';
import { CreateRequestData, RequestUnit, UNIT_LABELS } from '@/types/requests';

interface RequestFormProps {
  initialData?: Partial<CreateRequestData>;
  onSubmit: (data: CreateRequestData) => void;
  onSaveDraft?: (data: CreateRequestData) => void;
  isLoading?: boolean;
  isEditMode?: boolean;
}

interface FormData {
  item: string;
  description: string;
  quantity: string;
  unit: RequestUnit;
  category: string;
  delivery_address: string;
  reason: string;
}

const RequestForm: React.FC<RequestFormProps> = ({
  initialData,
  onSubmit,
  onSaveDraft,
  isLoading = false,
  isEditMode = false,
}) => {
  const [unitMenuVisible, setUnitMenuVisible] = useState(false);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      item: initialData?.item || '',
      description: initialData?.description || '',
      quantity: initialData?.quantity || '',
      unit: initialData?.unit || 'pieces',
      category: initialData?.category || '',
      delivery_address: initialData?.delivery_address || '',
      reason: initialData?.reason || '',
    },
  });

  const watchedUnit = watch('unit');
  const watchedCategory = watch('category');

  useEffect(() => {
    // Update selected categories when form loads
    if (initialData?.category) {
      const categories = initialData.category.split(',').map(c => c.trim());
      setSelectedCategories(categories);
    }
  }, [initialData]);

  const handleFormSubmit = (data: FormData) => {
    const submitData: CreateRequestData = {
      ...data,
      category: selectedCategories.join(', '),
    };
    onSubmit(submitData);
  };

  const handleSaveDraft = () => {
    if (!onSaveDraft) return;
    
    const data = getValues();
    const draftData: CreateRequestData = {
      ...data,
      category: selectedCategories.join(', '),
    };
    onSaveDraft(draftData);
  };

  const handleUnitSelect = (unit: RequestUnit) => {
    setValue('unit', unit, { shouldDirty: true });
    setUnitMenuVisible(false);
  };

  const handleCategoryAdd = (category: string) => {
    if (!selectedCategories.includes(category)) {
      const newCategories = [...selectedCategories, category];
      setSelectedCategories(newCategories);
      setValue('category', newCategories.join(', '), { shouldDirty: true });
    }
    setCategoryMenuVisible(false);
  };

  const handleCategoryRemove = (category: string) => {
    const newCategories = selectedCategories.filter(c => c !== category);
    setSelectedCategories(newCategories);
    setValue('category', newCategories.join(', '), { shouldDirty: true });
  };

  const showDiscardDialog = () => {
    if (!isDirty) return true;
    
    Alert.alert(
      'Discard Changes?',
      'You have unsaved changes. Are you sure you want to discard them?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => true },
      ]
    );
    return false;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.formCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.formTitle}>
            {isEditMode ? 'Edit Request' : 'Create New Request'}
          </Text>

          {/* Item Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Item Name *</Text>
            <Controller
              control={control}
              name="item"
              rules={VALIDATION_RULES.ITEM_NAME}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={!!errors.item}
                  placeholder="What do you need to purchase?"
                  style={styles.input}
                  returnKeyType="next"
                />
              )}
            />
            {errors.item && (
              <Text style={styles.errorText}>{errors.item.message}</Text>
            )}
          </View>

          {/* Description */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Description</Text>
            <Controller
              control={control}
              name="description"
              rules={VALIDATION_RULES.DESCRIPTION}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={!!errors.description}
                  placeholder="Provide additional details about the item"
                  multiline
                  numberOfLines={3}
                  style={[styles.input, styles.multilineInput]}
                />
              )}
            />
            {errors.description && (
              <Text style={styles.errorText}>{errors.description.message}</Text>
            )}
          </View>

          {/* Quantity and Unit */}
          <View style={styles.rowContainer}>
            <View style={[styles.fieldContainer, styles.quantityField]}>
              <Text style={styles.fieldLabel}>Quantity *</Text>
              <Controller
                control={control}
                name="quantity"
                rules={VALIDATION_RULES.QUANTITY}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    mode="outlined"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.quantity}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    style={styles.input}
                    returnKeyType="done"
                  />
                )}
              />
              {errors.quantity && (
                <Text style={styles.errorText}>{errors.quantity.message}</Text>
              )}
            </View>

            <View style={[styles.fieldContainer, styles.unitField]}>
              <Text style={styles.fieldLabel}>Unit *</Text>
              <Menu
                visible={unitMenuVisible}
                onDismiss={() => setUnitMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setUnitMenuVisible(true)}
                    style={[styles.input, styles.menuButton]}
                    contentStyle={styles.menuButtonContent}
                    icon="chevron-down"
                  >
                    {UNIT_LABELS[watchedUnit]}
                  </Button>
                }
              >
                {Object.entries(UNIT_LABELS).map(([unit, label]) => (
                  <Menu.Item
                    key={unit}
                    onPress={() => handleUnitSelect(unit as RequestUnit)}
                    title={label}
                  />
                ))}
              </Menu>
            </View>
          </View>

          {/* Categories */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Categories</Text>
            <Menu
              visible={categoryMenuVisible}
              onDismiss={() => setCategoryMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setCategoryMenuVisible(true)}
                  style={[styles.input, styles.menuButton]}
                  contentStyle={styles.menuButtonContent}
                  icon="plus"
                >
                  Add Category
                </Button>
              }
            >
              {REQUEST_CATEGORIES.map((category) => (
                <Menu.Item
                  key={category}
                  onPress={() => handleCategoryAdd(category)}
                  title={category}
                  disabled={selectedCategories.includes(category)}
                />
              ))}
            </Menu>
            
            {selectedCategories.length > 0 && (
              <View style={styles.chipContainer}>
                {selectedCategories.map((category) => (
                  <Chip
                    key={category}
                    onClose={() => handleCategoryRemove(category)}
                    style={styles.chip}
                  >
                    {category}
                  </Chip>
                ))}
              </View>
            )}
          </View>

          {/* Delivery Address */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Delivery Address</Text>
            <Controller
              control={control}
              name="delivery_address"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Where should this item be delivered?"
                  multiline
                  numberOfLines={2}
                  style={[styles.input, styles.multilineInput]}
                />
              )}
            />
          </View>

          {/* Reason/Justification */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Reason for Purchase</Text>
            <Controller
              control={control}
              name="reason"
              rules={VALIDATION_RULES.REASON}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={!!errors.reason}
                  placeholder="Why is this purchase necessary?"
                  multiline
                  numberOfLines={3}
                  style={[styles.input, styles.multilineInput]}
                />
              )}
            />
            {errors.reason && (
              <Text style={styles.errorText}>{errors.reason.message}</Text>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {onSaveDraft && (
          <Button
            mode="outlined"
            onPress={handleSaveDraft}
            disabled={isLoading}
            style={[styles.button, styles.draftButton]}
            contentStyle={styles.buttonContent}
            icon="content-save"
          >
            Save Draft
          </Button>
        )}
        
        <Button
          mode="contained"
          onPress={handleSubmit(handleFormSubmit)}
          loading={isLoading}
          disabled={isLoading}
          style={[styles.button, styles.submitButton]}
          contentStyle={styles.buttonContent}
          icon={isEditMode ? "check" : "send"}
        >
          {isEditMode ? 'Update Request' : 'Submit Request'}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  formCard: {
    marginBottom: Spacing.lg,
  },
  formTitle: {
    color: Colors.text,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background,
    minHeight: Dimensions.input.height,
  },
  multilineInput: {
    minHeight: 80,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  quantityField: {
    flex: 2,
  },
  unitField: {
    flex: 3,
  },
  menuButton: {
    justifyContent: 'flex-start',
  },
  menuButtonContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    height: Dimensions.input.height,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  chip: {
    marginBottom: Spacing.xs,
  },
  buttonContainer: {
    gap: Spacing.sm,
  },
  button: {
    marginBottom: Spacing.sm,
  },
  buttonContent: {
    height: Dimensions.button.height,
  },
  draftButton: {
    borderColor: Colors.textSecondary,
  },
  submitButton: {
    backgroundColor: Colors.primary,
  },
});

export default RequestForm;