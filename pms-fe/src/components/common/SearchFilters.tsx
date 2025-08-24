import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { RequestQueryParams, UserQueryParams, DocumentQueryParams } from '../../types/api';

interface SearchFiltersProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: any) => void;
  onClearFilters: () => void;
  filterType: 'requests' | 'users' | 'documents';
  currentFilters?: any;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  visible,
  onClose,
  onApplyFilters,
  onClearFilters,
  filterType,
  currentFilters = {},
}) => {
  const [filters, setFilters] = useState(currentFilters);

  const updateFilter = (key: string, value: any) => {
    setFilters((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApply = () => {
    // Remove empty values
    const cleanFilters = Object.keys(filters).reduce((acc: any, key) => {
      if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) {
        acc[key] = filters[key];
      }
      return acc;
    }, {});
    
    onApplyFilters(cleanFilters);
    onClose();
  };

  const handleClear = () => {
    setFilters({});
    onClearFilters();
    onClose();
  };

  const renderRequestFilters = () => (
    <View>
      {/* Status Filter */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Status</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={filters.status || ''}
            onValueChange={(value) => updateFilter('status', value)}
            style={styles.picker}
          >
            <Picker.Item label="All Statuses" value="" />
            <Picker.Item label="Draft" value="draft" />
            <Picker.Item label="Pending" value="pending" />
            <Picker.Item label="In Review" value="in_review" />
            <Picker.Item label="Revision Requested" value="revision_requested" />
            <Picker.Item label="Approved" value="approved" />
            <Picker.Item label="Rejected" value="rejected" />
            <Picker.Item label="Purchasing" value="purchasing" />
            <Picker.Item label="Ordered" value="ordered" />
            <Picker.Item label="Delivered" value="delivered" />
            <Picker.Item label="Completed" value="completed" />
          </Picker>
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Category</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={filters.category || ''}
            onValueChange={(value) => updateFilter('category', value)}
            style={styles.picker}
          >
            <Picker.Item label="All Categories" value="" />
            <Picker.Item label="Office Supplies" value="Office Supplies" />
            <Picker.Item label="Equipment" value="Equipment" />
            <Picker.Item label="Furniture" value="Furniture" />
            <Picker.Item label="IT Hardware" value="IT Hardware" />
            <Picker.Item label="Software" value="Software" />
            <Picker.Item label="Maintenance" value="Maintenance" />
            <Picker.Item label="Other" value="Other" />
          </Picker>
        </View>
      </View>

      {/* Date Range */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Created After</Text>
        <TextInput
          style={styles.textInput}
          placeholder="YYYY-MM-DD"
          value={filters.created_at_after || ''}
          onChangeText={(value) => updateFilter('created_at_after', value)}
        />
      </View>

      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Created Before</Text>
        <TextInput
          style={styles.textInput}
          placeholder="YYYY-MM-DD"
          value={filters.created_at_before || ''}
          onChangeText={(value) => updateFilter('created_at_before', value)}
        />
      </View>

      {/* Ordering */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Sort By</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={filters.ordering || ''}
            onValueChange={(value) => updateFilter('ordering', value)}
            style={styles.picker}
          >
            <Picker.Item label="Newest First" value="-created_at" />
            <Picker.Item label="Oldest First" value="created_at" />
            <Picker.Item label="Item A-Z" value="item" />
            <Picker.Item label="Item Z-A" value="-item" />
            <Picker.Item label="Status" value="status" />
            <Picker.Item label="Category" value="category" />
          </Picker>
        </View>
      </View>
    </View>
  );

  const renderUserFilters = () => (
    <View>
      {/* Active Status */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Status</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={filters.is_active?.toString() || ''}
            onValueChange={(value) => updateFilter('is_active', value === 'true' ? true : value === 'false' ? false : undefined)}
            style={styles.picker}
          >
            <Picker.Item label="All Users" value="" />
            <Picker.Item label="Active Only" value="true" />
            <Picker.Item label="Inactive Only" value="false" />
          </Picker>
        </View>
      </View>

      {/* Super User */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>User Type</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={filters.is_superuser?.toString() || ''}
            onValueChange={(value) => updateFilter('is_superuser', value === 'true' ? true : value === 'false' ? false : undefined)}
            style={styles.picker}
          >
            <Picker.Item label="All Types" value="" />
            <Picker.Item label="Admins Only" value="true" />
            <Picker.Item label="Regular Users" value="false" />
          </Picker>
        </View>
      </View>

      {/* Ordering */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Sort By</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={filters.ordering || ''}
            onValueChange={(value) => updateFilter('ordering', value)}
            style={styles.picker}
          >
            <Picker.Item label="First Name A-Z" value="first_name" />
            <Picker.Item label="First Name Z-A" value="-first_name" />
            <Picker.Item label="Last Name A-Z" value="last_name" />
            <Picker.Item label="Last Name Z-A" value="-last_name" />
            <Picker.Item label="Username A-Z" value="username" />
            <Picker.Item label="Username Z-A" value="-username" />
            <Picker.Item label="Newest First" value="-date_joined" />
            <Picker.Item label="Oldest First" value="date_joined" />
          </Picker>
        </View>
      </View>
    </View>
  );

  const renderDocumentFilters = () => (
    <View>
      {/* Document Type */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Document Type</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={filters.document_type || ''}
            onValueChange={(value) => updateFilter('document_type', value)}
            style={styles.picker}
          >
            <Picker.Item label="All Types" value="" />
            <Picker.Item label="Quotation" value="quote" />
            <Picker.Item label="Purchase Order" value="purchase_order" />
            <Picker.Item label="Dispatch Note" value="dispatch_note" />
            <Picker.Item label="Receipt" value="receipt" />
            <Picker.Item label="Invoice" value="invoice" />
            <Picker.Item label="Other" value="other" />
          </Picker>
        </View>
      </View>

      {/* Status */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Status</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={filters.status || ''}
            onValueChange={(value) => updateFilter('status', value)}
            style={styles.picker}
          >
            <Picker.Item label="All Statuses" value="" />
            <Picker.Item label="Pending" value="pending" />
            <Picker.Item label="Uploaded" value="uploaded" />
            <Picker.Item label="Failed" value="failed" />
          </Picker>
        </View>
      </View>

      {/* Ordering */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Sort By</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={filters.ordering || ''}
            onValueChange={(value) => updateFilter('ordering', value)}
            style={styles.picker}
          >
            <Picker.Item label="Newest First" value="-created_at" />
            <Picker.Item label="Oldest First" value="created_at" />
            <Picker.Item label="File Name A-Z" value="file_name" />
            <Picker.Item label="File Name Z-A" value="-file_name" />
            <Picker.Item label="File Size (Largest)" value="-file_size" />
            <Picker.Item label="File Size (Smallest)" value="file_size" />
            <Picker.Item label="Document Type" value="document_type" />
          </Picker>
        </View>
      </View>
    </View>
  );

  const renderFilters = () => {
    switch (filterType) {
      case 'requests':
        return renderRequestFilters();
      case 'users':
        return renderUserFilters();
      case 'documents':
        return renderDocumentFilters();
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Search Filters</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {renderFilters()}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={handleClear}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.applyButton]}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  filterGroup: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  picker: {
    height: 50,
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    backgroundColor: '#fff',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  clearButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  clearButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
  applyButton: {
    backgroundColor: '#007bff',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SearchFilters;