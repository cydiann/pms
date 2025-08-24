import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import documentService from '../../services/documentService';
import { ProcurementDocument, CreateDocumentDto } from '../../services/documentService';
import { showError, showSuccess, showSimpleAlert } from '../../utils/platformUtils';

interface FileUploadProps {
  requestId: number;
  requestStatus: string;
  documentType?: 'quote' | 'purchase_order' | 'dispatch_note' | 'receipt' | 'invoice' | 'other';
  onUploadComplete?: (document: ProcurementDocument) => void;
  style?: any;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  requestId,
  requestStatus,
  documentType = 'other',
  onUploadComplete,
  style,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [showDescriptionInput, setShowDescriptionInput] = useState(false);

  const canUploadDocumentType = (type: string, status: string): boolean => {
    return documentService.canUploadDocumentType(type, status);
  };

  const handleFileSelect = () => {
    if (disabled || uploading) return;
    
    // Check if document type can be uploaded for current request status
    if (!canUploadDocumentType(documentType, requestStatus)) {
      showError(
        'Upload Not Allowed',
        `Cannot upload ${documentService.getDocumentTypeDisplay(documentType)} for requests with status "${requestStatus}"`
      );
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;

    // Validate file type
    if (!documentService.validateFileType(file)) {
      showError(
        'Invalid File Type',
        'Please select a valid file type (PDF, DOC, XLS, images, etc.)'
      );
      return;
    }

    // Validate file size (10MB limit)
    if (!documentService.validateFileSize(file)) {
      showError(
        'File Too Large',
        `File size must be less than ${documentService.formatFileSize(10485760)}`
      );
      return;
    }

    // Store the file and show description input
    setSelectedFile(file);
    setShowDescriptionInput(true);
    setDescription(`${documentService.getDocumentTypeDisplay(documentType)} - ${file.name}`);
    
    // Clear the input so the same file can be selected again
    target.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    await uploadFile(selectedFile);
    
    // Reset state after upload
    setSelectedFile(null);
    setShowDescriptionInput(false);
    setDescription('');
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setShowDescriptionInput(false);
    setDescription('');
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    
    try {
      const documentData: CreateDocumentDto = {
        request: requestId,
        document_type: documentType,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        description: description || `${documentService.getDocumentTypeDisplay(documentType)} - ${file.name}`,
      };

      const uploadedDocument = await documentService.completeUpload(documentData, file);
      
      showSuccess('Upload Successful', `${file.name} has been uploaded successfully!`);
      
      onUploadComplete?.(uploadedDocument);
      
    } catch (error: any) {
      console.error('Upload failed:', error);
      showError('Upload Failed', error.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getButtonText = () => {
    if (uploading) return 'Uploading...';
    return `Upload ${documentService.getDocumentTypeDisplay(documentType)}`;
  };

  const isUploadAllowed = canUploadDocumentType(documentType, requestStatus);

  // Don't render the component if user doesn't have permission and upload is not allowed
  if (!isUploadAllowed && !disabled) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.webp,.txt,.zip,.rar"
      />
      
      {!showDescriptionInput ? (
        <TouchableOpacity
          style={[
            styles.uploadButton,
            (disabled || !isUploadAllowed || uploading) && styles.uploadButtonDisabled
          ]}
          onPress={handleFileSelect}
          disabled={disabled || !isUploadAllowed || uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" style={styles.loadingIcon} />
          ) : (
            <Icon 
              name="cloud-upload" 
              size={20} 
              color={disabled || !isUploadAllowed ? '#999' : '#fff'} 
              style={styles.uploadIcon} 
            />
          )}
          
          <Text style={[
            styles.uploadButtonText,
            (disabled || !isUploadAllowed) && styles.uploadButtonTextDisabled
          ]}>
            {getButtonText()}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.uploadForm}>
          <Text style={styles.selectedFileName}>
            Selected: {selectedFile?.name}
          </Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Enter document description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
          />
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={[styles.formButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={uploading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formButton, styles.confirmButton, uploading && styles.uploadButtonDisabled]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Upload</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {!isUploadAllowed && (
        <Text style={styles.warningText}>
          {documentService.getDocumentTypeDisplay(documentType)} can only be uploaded when request status is appropriate
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 48,
  },
  uploadButtonDisabled: {
    backgroundColor: '#e9ecef',
    borderColor: '#dee2e6',
    borderWidth: 1,
  },
  uploadIcon: {
    marginRight: 8,
  },
  loadingIcon: {
    marginRight: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButtonTextDisabled: {
    color: '#999',
  },
  warningText: {
    fontSize: 12,
    color: '#ffc107',
    marginTop: 4,
    textAlign: 'center',
  },
  uploadForm: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  selectedFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  descriptionInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    minHeight: 60,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  formButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#007bff',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default FileUpload;