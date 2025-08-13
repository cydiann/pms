import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import requestService from '../../services/requestService';
import { CreateRequestDto, RequestUnit } from '../../types/requests';

const CreateRequestScreen: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateRequestDto>({
    item: '',
    description: '',
    quantity: '',
    unit: RequestUnit.PIECES,
    category: '',
    delivery_address: '',
    reason: '',
  });

  const handleInputChange = (field: keyof CreateRequestDto, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.item.trim()) {
      Alert.alert('Error', 'Item name is required');
      return;
    }
    if (!formData.quantity.trim()) {
      Alert.alert('Error', 'Quantity is required');
      return;
    }
    if (!formData.reason.trim()) {
      Alert.alert('Error', 'Reason is required');
      return;
    }

    setLoading(true);
    try {
      const newRequest = await requestService.createRequest(formData);
      Alert.alert(
        'Success',
        `Request ${newRequest.request_number} has been created successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFormData({
                item: '',
                description: '',
                quantity: '',
                unit: RequestUnit.PIECES,
                category: '',
                delivery_address: '',
                reason: '',
              });
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const unitOptions = [
    { value: RequestUnit.PIECES, label: 'Pieces' },
    { value: RequestUnit.KG, label: 'Kilograms' },
    { value: RequestUnit.METER, label: 'Meters' },
    { value: RequestUnit.M2, label: 'Square Meters' },
    { value: RequestUnit.LITER, label: 'Liters' },
  ];

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>
            Create New Request
          </Text>
          <Text style={styles.subtitle}>
            Fill in the details for your procurement request
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* Item Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.item}
              onChangeText={(value) => handleInputChange('item', value)}
              placeholder="What do you need to purchase?"
              placeholderTextColor="#6c757d"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder="Provide additional details..."
              placeholderTextColor="#6c757d"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Quantity and Unit */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Quantity *</Text>
              <TextInput
                style={styles.input}
                value={formData.quantity}
                onChangeText={(value) => handleInputChange('quantity', value)}
                placeholder="0"
                placeholderTextColor="#6c757d"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
              <Text style={styles.label}>Unit</Text>
              <View style={styles.unitSelector}>
                {unitOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.unitOption,
                      formData.unit === option.value && styles.unitOptionActive
                    ]}
                    onPress={() => handleInputChange('unit', option.value)}
                  >
                    <Text style={[
                      styles.unitOptionText,
                      formData.unit === option.value && styles.unitOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              value={formData.category}
              onChangeText={(value) => handleInputChange('category', value)}
              placeholder="e.g., Office Supplies, Equipment, Materials"
              placeholderTextColor="#6c757d"
            />
          </View>

          {/* Delivery Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Delivery Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.delivery_address}
              onChangeText={(value) => handleInputChange('delivery_address', value)}
              placeholder="Where should this be delivered?"
              placeholderTextColor="#6c757d"
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Reason */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reason/Justification *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.reason}
              onChangeText={(value) => handleInputChange('reason', value)}
              placeholder="Why do you need this item?"
              placeholderTextColor="#6c757d"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Creating Request...' : 'Create Request'}
            </Text>
          </TouchableOpacity>
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
  scrollContainer: {
    flex: 1,
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  formContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#e9ecef',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#495057',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  marginLeft: {
    marginLeft: 10,
  },
  unitSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  unitOption: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  unitOptionActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  unitOptionText: {
    fontSize: 12,
    color: '#6c757d',
  },
  unitOptionTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
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
});

export default CreateRequestScreen;