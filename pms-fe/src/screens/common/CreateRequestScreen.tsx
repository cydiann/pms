import React, { useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  createRequest, 
  updateRequest, 
  fetchRequest,
  selectCurrentRequest, 
  selectRequestsLoading 
} from '@/store/slices/requestsSlice';
import { showSuccessNotification, showErrorNotification } from '@/store/slices/appSlice';

import RequestForm from '@/components/forms/RequestForm';
import LoadingScreen from './LoadingScreen';
import { Colors } from '@/constants/theme';
import { SUCCESS_MESSAGES } from '@/constants/app';
import { CreateRequestData } from '@/types/requests';

type CreateRequestScreenRouteProp = RouteProp<{
  CreateRequest: { editRequestId?: number };
}, 'CreateRequest'>;

const CreateRequestScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CreateRequestScreenRouteProp>();
  const dispatch = useAppDispatch();

  const currentRequest = useAppSelector(selectCurrentRequest);
  const isLoading = useAppSelector(selectRequestsLoading);

  const editRequestId = route.params?.editRequestId;
  const isEditMode = !!editRequestId;

  useEffect(() => {
    // Load request data if in edit mode
    if (editRequestId && (!currentRequest || currentRequest.id !== editRequestId)) {
      dispatch(fetchRequest(editRequestId));
    }
  }, [dispatch, editRequestId, currentRequest]);

  const handleSubmitRequest = async (data: CreateRequestData) => {
    try {
      if (isEditMode && editRequestId) {
        // Update existing request
        const result = await dispatch(updateRequest({ id: editRequestId, ...data }));
        
        if (updateRequest.fulfilled.match(result)) {
          dispatch(showSuccessNotification(SUCCESS_MESSAGES.REQUEST_UPDATED));
          navigation.goBack();
        } else {
          dispatch(showErrorNotification(
            result.payload as string || 'Failed to update request'
          ));
        }
      } else {
        // Create new request
        const result = await dispatch(createRequest(data));
        
        if (createRequest.fulfilled.match(result)) {
          dispatch(showSuccessNotification(SUCCESS_MESSAGES.REQUEST_CREATED));
          
          // Navigate to the new request details
          const newRequest = result.payload;
          navigation.navigate('RequestDetails' as never, { requestId: newRequest.id } as never);
        } else {
          dispatch(showErrorNotification(
            result.payload as string || 'Failed to create request'
          ));
        }
      }
    } catch (error) {
      dispatch(showErrorNotification('An unexpected error occurred'));
    }
  };

  const handleSaveDraft = async (data: CreateRequestData) => {
    try {
      if (isEditMode && editRequestId) {
        // Update existing draft
        const result = await dispatch(updateRequest({ id: editRequestId, ...data }));
        
        if (updateRequest.fulfilled.match(result)) {
          dispatch(showSuccessNotification('Draft updated'));
        } else {
          dispatch(showErrorNotification(
            result.payload as string || 'Failed to save draft'
          ));
        }
      } else {
        // Create new draft
        const result = await dispatch(createRequest(data));
        
        if (createRequest.fulfilled.match(result)) {
          dispatch(showSuccessNotification('Draft saved'));
          
          // Update navigation to edit mode for the new draft
          const newRequest = result.payload;
          navigation.setParams({ editRequestId: newRequest.id } as never);
        } else {
          dispatch(showErrorNotification(
            result.payload as string || 'Failed to save draft'
          ));
        }
      }
    } catch (error) {
      dispatch(showErrorNotification('Failed to save draft'));
    }
  };

  // Show loading screen while fetching request data in edit mode
  if (isEditMode && isLoading && !currentRequest) {
    return <LoadingScreen message="Loading request..." />;
  }

  // If we're in edit mode but can't edit this request
  if (isEditMode && currentRequest && currentRequest.status !== 'draft') {
    Alert.alert(
      'Cannot Edit Request',
      'This request can no longer be edited because it has been submitted.',
      [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]
    );
    return null;
  }

  const initialData = currentRequest && isEditMode ? {
    item: currentRequest.item,
    description: currentRequest.description,
    quantity: currentRequest.quantity,
    unit: currentRequest.unit,
    category: currentRequest.category,
    delivery_address: currentRequest.delivery_address,
    reason: currentRequest.reason,
  } : undefined;

  return (
    <View style={styles.container}>
      <RequestForm
        initialData={initialData}
        onSubmit={handleSubmitRequest}
        onSaveDraft={handleSaveDraft}
        isLoading={isLoading}
        isEditMode={isEditMode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

export default CreateRequestScreen;