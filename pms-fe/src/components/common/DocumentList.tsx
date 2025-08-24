import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import documentService, { ProcurementDocument } from '../../services/documentService';
import { showError, showConfirm } from '../../utils/platformUtils';

interface DocumentListProps {
  requestId: number;
  onDocumentsChange?: (documents: ProcurementDocument[]) => void;
  style?: any;
  refreshTrigger?: number;
}

const DocumentList: React.FC<DocumentListProps> = ({
  requestId,
  onDocumentsChange,
  style,
  refreshTrigger,
}) => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<ProcurementDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDocuments = async () => {
    try {
      const docs = await documentService.getDocumentsByRequest(requestId);
      setDocuments(docs);
      onDocumentsChange?.(docs);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      showError('Error', 'Failed to load documents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [requestId, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

  const handleDownload = async (document: ProcurementDocument) => {
    try {
      await documentService.downloadFile(document.id);
    } catch (error: any) {
      showError('Download Failed', error.message || 'Failed to download file');
    }
  };

  const handleDelete = async (document: ProcurementDocument) => {
    if (!document.can_delete) {
      showError('Cannot Delete', 'You do not have permission to delete this document');
      return;
    }

    // Use platform-agnostic confirm dialog
    showConfirm(
      'Confirm Delete',
      `Are you sure you want to delete "${document.file_name}"?`,
      async () => {
        try {
          await documentService.deleteDocument(document.id);
          loadDocuments(); // Refresh the list
        } catch (error: any) {
          showError('Delete Failed', error.message || 'Failed to delete document');
        }
      },
      undefined,
      'Delete',
      'Cancel',
      true // destructive action
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return { name: 'check-circle', color: '#28a745' };
      case 'pending':
        return { name: 'access-time', color: '#ffc107' };
      case 'failed':
        return { name: 'error', color: '#dc3545' };
      default:
        return { name: 'help', color: '#6c757d' };
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return 'picture-as-pdf';
    if (fileType.includes('word') || fileType.includes('document')) return 'description';
    if (fileType.includes('sheet') || fileType.includes('excel')) return 'grid-on';
    if (fileType.includes('image')) return 'image';
    return 'insert-drive-file';
  };

  const renderDocumentItem = ({ item }: { item: ProcurementDocument }) => {
    const statusIcon = getStatusIcon(item.status);
    const fileIcon = getFileIcon(item.file_type);

    return (
      <View style={styles.documentItem}>
        <View style={styles.documentHeader}>
          <View style={styles.documentInfo}>
            <Icon name={fileIcon} size={24} color="#007bff" style={styles.fileIcon} />
            <View style={styles.documentDetails}>
              <Text style={styles.fileName} numberOfLines={1}>
                {item.file_name}
              </Text>
              <Text style={styles.documentType}>
                {documentService.getDocumentTypeDisplay(item.document_type)}
              </Text>
              <Text style={styles.fileSize}>
                {documentService.formatFileSize(item.file_size)} • {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusContainer}>
            <Icon 
              name={statusIcon.name} 
              size={20} 
              color={statusIcon.color}
            />
          </View>
        </View>

        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.documentActions}>
          {item.uploaded_by_name && (
            <Text style={styles.uploadedBy}>
              Uploaded by {item.uploaded_by_name}
            </Text>
          )}
          
          <View style={styles.actionButtons}>
            {item.status === 'uploaded' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDownload(item)}
              >
                <Icon name="download" size={18} color="#007bff" />
                <Text style={styles.actionButtonText}>Download</Text>
              </TouchableOpacity>
            )}
            
            {item.can_delete && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDelete(item)}
              >
                <Icon name="delete" size={18} color="#dc3545" />
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="folder-open" size={48} color="#dee2e6" />
      <Text style={styles.emptyStateText}>No documents uploaded yet</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading documents...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Documents ({documents.length})</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Icon name="refresh" size={20} color="#007bff" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={documents}
        renderItem={renderDocumentItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 8,
    color: '#6c757d',
  },
  documentItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  documentInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  fileIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  documentDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  documentType: {
    fontSize: 14,
    color: '#007bff',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#6c757d',
  },
  statusContainer: {
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#495057',
    marginTop: 8,
    fontStyle: 'italic',
  },
  documentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  uploadedBy: {
    fontSize: 12,
    color: '#6c757d',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#007bff',
    marginLeft: 4,
  },
  deleteButton: {
    // Additional styles for delete button if needed
  },
  deleteButtonText: {
    color: '#dc3545',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 8,
  },
});

export default DocumentList;