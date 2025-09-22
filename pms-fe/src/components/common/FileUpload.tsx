import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ViewStyle,
  Platform,
} from 'react-native';
import { pick, types, isErrorWithCode, errorCodes, DocumentPickerResponse } from '@react-native-documents/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import documentService from '../../services/documentService';
import { ProcurementDocument, CreateDocumentDto } from '../../services/documentService';
import { showError, showSuccess } from '../../utils/platformUtils';

type DocumentType = 'quote' | 'purchase_order' | 'dispatch_note' | 'receipt' | 'invoice' | 'other';

interface FileUploadProps {
  readonly requestId: number;
  readonly requestStatus: string;
  readonly documentType?: DocumentType;
  readonly onUploadComplete?: (document: ProcurementDocument) => void;
  readonly style?: ViewStyle | ViewStyle[];
  readonly disabled?: boolean;
}

function FileUpload({
  requestId,
  requestStatus,
  documentType = 'other',
  onUploadComplete,
  style,
  disabled = false,
}: FileUploadProps): React.JSX.Element | null {
const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPickerResponse | null>(null);
  const [description, setDescription] = useState('');
  const [showDescriptionInput, setShowDescriptionInput] = useState(false);

  // Constants
  const FILE_SIZE_LIMIT = 10485760 as const; // 10MB

  const canUploadDocumentType = (type: DocumentType, status: string): boolean => {
    return documentService.canUploadDocumentType(type, status);
  };

  const handleFileSelect = async () => {
    if (disabled || uploading) return;

    // Check if document type can be uploaded for current request status
    if (!canUploadDocumentType(documentType, requestStatus)) {
      showError(
        t('fileUpload.errors.uploadNotAllowed'),
        t('fileUpload.errors.uploadNotAllowedMessage', {
          documentType: documentService.getDocumentTypeDisplay(documentType, t),
          status: requestStatus
        })
      );
      return;
    }

    try {
      const result = await pick({
        type: [
          types.pdf,
          types.doc,
          types.docx,
          types.xls,
          types.xlsx,
          types.csv,
          types.images,
          types.plainText,
          types.zip,
        ],
      });

      const file = result[0];

      // Validate file size (10MB limit)
      if (!documentService.validateFileSize(file, FILE_SIZE_LIMIT)) {
        showError(
          t('fileUpload.errors.fileTooLarge'),
          t('fileUpload.errors.fileTooLargeMessage', {
            maxSize: documentService.formatFileSize(FILE_SIZE_LIMIT)
          })
        );
        return;
      }

      // Store the file and show description input
      setSelectedFile(file);
      setShowDescriptionInput(true);
      setDescription(`${documentService.getDocumentTypeDisplay(documentType, t)} - ${file.name}`);

    } catch (error: any) {
      if (isErrorWithCode(error) && error.code === errorCodes.CANCELED) {
        // User cancelled the picker
        return;
      }
      console.error('Document picker error:', error);
      showError(
        t('fileUpload.errors.selectionFailed'),
        t('fileUpload.errors.selectionFailedMessage')
      );
    }
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

  const uploadFile = async (file: DocumentPickerResponse) => {
    setUploading(true);

    try {
      const documentData: CreateDocumentDto = {
        request: requestId,
        document_type: documentType,
        file_name: file.name || 'unknown',
        file_size: file.size || 0,
        file_type: file.type || 'application/octet-stream',
        description: description || `${documentService.getDocumentTypeDisplay(documentType, t)} - ${file.name}`,
      };

      const uploadedDocument = await documentService.completeUpload(documentData, file);

      showSuccess(
        t('fileUpload.success.uploadSuccessful'),
        t('fileUpload.success.uploadSuccessfulMessage', { fileName: file.name })
      );

      onUploadComplete?.(uploadedDocument);

    } catch (error: any) {
      if (error?.response) {
        console.error('Upload failed (API):', error.response.status, error.response.data);
      } else {
        console.error('Upload failed:', error);
      }
      showError(
        t('fileUpload.errors.uploadFailed'),
        error.message || t('fileUpload.errors.uploadFailedMessage')
      );
    } finally {
      setUploading(false);
    }
  };

  const getButtonText = (): string => {
    if (uploading) return t('fileUpload.actions.uploading');
    return t('fileUpload.actions.uploadDocument', {
      documentType: documentService.getDocumentTypeDisplay(documentType, t)
    });
  };

  const isUploadAllowed = canUploadDocumentType(documentType, requestStatus);

  // Don't render the component if user doesn't have permission and upload is not allowed
  if (!isUploadAllowed && !disabled) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      
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
            placeholder={t('fileUpload.labels.enterDescription')}
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
              <Text style={styles.cancelButtonText}>{t('fileUpload.actions.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formButton, styles.confirmButton, uploading && styles.uploadButtonDisabled]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>{t('fileUpload.actions.upload')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {!isUploadAllowed && (
        <Text style={styles.warningText}>
          {t('fileUpload.labels.warningCannotUpload', {
            documentType: documentService.getDocumentTypeDisplay(documentType, t)
          })}
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
} as const);

export type { DocumentType, FileUploadProps };
export default FileUpload as (props: FileUploadProps) => React.JSX.Element | null;
