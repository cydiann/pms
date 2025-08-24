import React, { useState, useEffect } from 'react';
import { TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (searchTerm: string) => void;
  onClear?: () => void;
  initialValue?: string;
  debounceMs?: number;
  style?: any;
  showSearchButton?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...',
  onSearch,
  onClear,
  initialValue = '',
  debounceMs = 500,
  style,
  showSearchButton = true,
}) => {
  const [searchText, setSearchText] = useState(initialValue);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  const handleSearch = (text: string) => {
    setSearchText(text);

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer for debounced search
    const timer = setTimeout(() => {
      onSearch(text.trim());
    }, debounceMs);

    setDebounceTimer(timer);
  };

  const handleClear = () => {
    setSearchText('');
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    onSearch('');
    if (onClear) {
      onClear();
    }
  };

  const handleSearchButtonPress = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    onSearch(searchText.trim());
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        
        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={handleSearch}
          returnKeyType="search"
          onSubmitEditing={handleSearchButtonPress}
        />
        
        {searchText.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Icon name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      
      {showSearchButton && (
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearchButtonPress}
        >
          <Icon name="search" size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 45,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  searchIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0, // Remove default padding on Android
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
});

export default SearchBar;