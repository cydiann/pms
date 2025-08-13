import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RouteProp, useRoute } from '@react-navigation/native';
import { MainStackParamList } from '../../navigation/MainStack';

type RequestDetailScreenRouteProp = RouteProp<MainStackParamList, 'RequestDetail'>;

const RequestDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<RequestDetailScreenRouteProp>();
  const { requestId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('requests.detailTitle')}
      </Text>
      <Text style={styles.subtitle}>
        Request ID: {requestId}
      </Text>
      <Text style={styles.placeholder}>
        Request details will be displayed here...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
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
    marginBottom: 20,
  },
  placeholder: {
    fontSize: 16,
    color: '#6c757d',
    fontStyle: 'italic',
  },
});

export default RequestDetailScreen;