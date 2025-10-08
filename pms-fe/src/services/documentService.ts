import apiClient from './apiClient';
import { API_ENDPOINTS } from '../constants/api';
import { PaginatedResponse, DocumentQueryParams } from '../types/api';
import { DocumentPickerResponse } from '@react-native-documents/picker';
import { Platform } from 'react-native';

export interface ProcurementDocument {
  id: string;
  request: number;
  document_type: 'quote' | 'purchase_order' | 'dispatch_note' | 'receipt' | 'invoice' | 'other';
  file_name: string;
  file_size: number;
  file_type: string;
  status: 'pending' | 'uploaded' | 'failed' | 'deleted';
  uploaded_at?: string;
  created_at: string;
  updated_at: string;
  description: string;
  metadata: Record<string, any>;
  uploaded_by?: number;
  uploaded_by_name?: string;
  download_url?: string;
  can_delete: boolean;
}

export interface CreateDocumentDto {
  request: number;
  document_type: 'quote' | 'purchase_order' | 'dispatch_note' | 'receipt' | 'invoice' | 'other';
  file_name: string;
  file_size: number;
  file_type: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreateDocumentResponse extends ProcurementDocument {
  upload_url: string;
}

class DocumentService {
  // Get all documents with optional filters and pagination
  async getAllDocuments(params?: DocumentQueryParams): Promise<PaginatedResponse<ProcurementDocument>> {
    const cleanParams = this.cleanParams(params);
    const queryString = cleanParams ? new URLSearchParams(cleanParams).toString() : '';
    const url = `${API_ENDPOINTS.REQUESTS.DOCUMENTS}${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get<PaginatedResponse<ProcurementDocument>>(url);
  }

  // Search documents with comprehensive filters
  async searchDocuments(searchTerm: string, filters?: Omit<DocumentQueryParams, 'search'>): Promise<PaginatedResponse<ProcurementDocument>> {
    const params: DocumentQueryParams = {
      search: searchTerm,
      ...filters
    };
    return await this.getAllDocuments(params);
  }

  // Get all documents for a request
  async getDocumentsByRequest(requestId: number): Promise<ProcurementDocument[]> {
    const url = `${API_ENDPOINTS.REQUESTS.DOCUMENTS_BY_REQUEST}?request_id=${requestId}`;
    return await apiClient.get<ProcurementDocument[]>(url);
  }

  // Get single document details
  async getDocument(id: string): Promise<ProcurementDocument> {
    return await apiClient.get<ProcurementDocument>(API_ENDPOINTS.REQUESTS.DOCUMENT_DETAIL(id));
  }

  // Create new document and get presigned upload URL
  async createDocument(data: CreateDocumentDto): Promise<CreateDocumentResponse> {
    return await apiClient.post<CreateDocumentResponse>(API_ENDPOINTS.REQUESTS.DOCUMENTS, data);
  }

  // Confirm that file has been uploaded to MinIO
  async confirmUpload(documentId: string): Promise<{ status: string; message: string }> {
    return await apiClient.post<{ status: string; message: string }>(
      API_ENDPOINTS.REQUESTS.DOCUMENT_CONFIRM_UPLOAD,
      { document_id: documentId }
    );
  }

  // Get fresh download URL for a document
  async getDownloadUrl(id: string): Promise<{ download_url: string; file_name: string; file_type: string }> {
    return await apiClient.get<{ download_url: string; file_name: string; file_type: string }>(
      API_ENDPOINTS.REQUESTS.DOCUMENT_DOWNLOAD(id)
    );
  }

  // Delete document (soft delete)
  async deleteDocument(id: string): Promise<void> {
    return await apiClient.delete<void>(API_ENDPOINTS.REQUESTS.DOCUMENT_DETAIL(id));
  }

  // Upload file to MinIO using presigned URL
  async uploadFile(presignedUrl: string, file: File | DocumentPickerResponse): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // Web platform - use File object
        const response = await fetch(presignedUrl, {
          method: 'PUT',
          body: file as File,
          headers: {
            'Content-Type': (file as File).type,
          },
        });
        if (!response.ok) {
          const text = await safeReadText(response);
          console.error('Upload failed (web):', response.status, text);
        }
        return response.ok;
      } else {
        // React Native - upload raw bytes directly (no multipart)
        const documentFile = file as DocumentPickerResponse;
        const uri = documentFile.uri;
        const contentType = documentFile.type ?? 'application/octet-stream';

        // Read local file into a Blob using fetch on the uri
        const localResp = await fetch(uri);
        const blob = await localResp.blob();

        const response = await fetch(presignedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
          },
          body: blob,
        });

        if (!response.ok) {
          const text = await safeReadText(response);
          console.error('Upload failed (native):', response.status, text);
        }
        return response.ok;
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      return false;
    }
  }

  // Complete upload flow: create document -> upload file -> confirm upload
  async completeUpload(data: CreateDocumentDto, file: File | DocumentPickerResponse): Promise<ProcurementDocument> {
    // Derive accurate file metadata
    const isWeb = Platform.OS === 'web';
    const fileName = isWeb ? (file as File).name : (file as DocumentPickerResponse).name || 'unknown';
    const fileType = isWeb ? (file as File).type : (file as DocumentPickerResponse).type || 'application/octet-stream';
    let fileSize: number | null | undefined = isWeb ? (file as File).size : (file as DocumentPickerResponse).size;

    if (!isWeb && (fileSize === null || typeof fileSize === 'undefined')) {
      try {
        const uri = (file as DocumentPickerResponse).uri;
        const probeResp = await fetch(uri);
        const probeBlob = await probeResp.blob();
        fileSize = probeBlob.size;
      } catch (e) {
        console.warn('Could not determine file size from uri; proceeding without size');
      }
    }

    const finalData: CreateDocumentDto = {
      ...data,
      file_name: fileName,
      file_type: fileType,
      file_size: typeof fileSize === 'number' ? fileSize : (data.file_size ?? 0),
    };

    // 1. Create document record and get presigned URL
    let createResponse: CreateDocumentResponse;
    try {
      createResponse = await this.createDocument(finalData);
      if (__DEV__) {
        console.log('createDocument OK:', { id: createResponse.id, hasUploadUrl: !!createResponse.upload_url });
      }
    } catch (e: any) {
      const status = e?.response?.status;
      const details = e?.response?.data;
      console.error('createDocument failed:', status, details || e?.message || e);
      throw e;
    }

    // 2. Upload file to MinIO
    const uploadSuccess = await this.uploadFile(createResponse.upload_url, file);
    if (!uploadSuccess) {
      // Clean up: delete the document record since upload failed
      try {
        await this.deleteDocument(createResponse.id);
        console.log('Deleted document record after failed upload');
      } catch (deleteError) {
        console.error('Failed to delete document record after upload failure:', deleteError);
      }
      throw new Error('Failed to upload file to storage');
    }

    // 3. Confirm upload completion
    let confirmResponse: { status: string; message: string };
    try {
      confirmResponse = await this.confirmUpload(createResponse.id);
    } catch (e: any) {
      const status = e?.response?.status;
      const details = e?.response?.data;
      console.error('confirmUpload failed:', status, details || e?.message || e);
      // Clean up: delete the document record since confirmation failed
      try {
        await this.deleteDocument(createResponse.id);
        console.log('Deleted document record after failed confirmation');
      } catch (deleteError) {
        console.error('Failed to delete document record after confirmation failure:', deleteError);
      }
      throw e;
    }
    if (confirmResponse.status !== 'success') {
      // Clean up: delete the document record since confirmation was not successful
      try {
        await this.deleteDocument(createResponse.id);
        console.log('Deleted document record after unsuccessful confirmation');
      } catch (deleteError) {
        console.error('Failed to delete document record after unsuccessful confirmation:', deleteError);
      }
      throw new Error('Failed to confirm upload');
    }

    // 4. Return updated document
    return await this.getDocument(createResponse.id);
  }

  // Download file from MinIO
  async downloadFile(id: string): Promise<void> {
    const { download_url, file_name } = await this.getDownloadUrl(id);

    if (Platform.OS === 'web') {
      // Web platform - use DOM manipulation
      if (typeof document !== 'undefined') {
        const link = document.createElement('a');
        link.href = download_url;
        link.download = file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      // React Native - open URL (could be enhanced with file download libraries)
      const { Linking } = require('react-native');
      await Linking.openURL(download_url);
    }
  }

  // Utility methods
  getDocumentTypeDisplay(type: string, t?: (key: string) => string): string {
    if (t) {
      // Use translation function if provided
      return t(`fileUpload.documentTypes.${type}`) || type;
    }

    // Fallback to English for backward compatibility
    const typeMap: Record<string, string> = {
      quote: 'Quotation',
      purchase_order: 'Purchase Order',
      dispatch_note: 'Dispatch Note',
      receipt: 'Delivery Receipt',
      invoice: 'Invoice',
      other: 'Other Document',
    };
    return typeMap[type] || type;
  }

  getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      pending: '#ffc107', // yellow
      uploaded: '#28a745', // green
      failed: '#dc3545',   // red
      deleted: '#6c757d',  // gray
    };
    return colorMap[status] || '#6c757d';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  validateFileType(file: File | DocumentPickerResponse): boolean {
    const allowedTypes = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

      // Spreadsheets
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',

      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',

      // Text
      'text/plain',

      // Archives
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
    ];

    const fileType = Platform.OS === 'web' ? (file as File).type : (file as DocumentPickerResponse).type;
    return allowedTypes.includes(fileType || 'application/octet-stream');
  }

  validateFileSize(file: File | DocumentPickerResponse | { size: number }, maxSize: number = 10485760): boolean {
    let fileSize: number | null | undefined;

    if (Platform.OS === 'web') {
      fileSize = (file as File).size;
    } else if ('size' in file && typeof file.size === 'number') {
      fileSize = file.size;
    } else {
      fileSize = (file as DocumentPickerResponse).size;
    }

    if (fileSize === null || typeof fileSize === 'undefined') {
      // Size unknown; allow upload but consider logging if needed
      return true;
    }

    return fileSize <= maxSize; // Default 10MB
  }

  canUploadDocumentType(documentType: string, requestStatus: string): boolean {
    switch (documentType) {
      case 'dispatch_note':
        return requestStatus === 'ordered';
      case 'receipt':
        return requestStatus === 'delivered';
      case 'quote':
      case 'purchase_order':
        return ['approved', 'purchasing'].includes(requestStatus);
      default:
        return true;
    }
  }

  // Utility method to clean parameters for API calls
  private cleanParams(params?: DocumentQueryParams): Record<string, string> | null {
    if (!params) return null;
    
    const cleanParams: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        cleanParams[key] = String(value);
      }
    });
    
    return Object.keys(cleanParams).length > 0 ? cleanParams : null;
  }
}

const documentService = new DocumentService();
export default documentService;

// Helper to safely read response text without throwing on empty bodies
async function safeReadText(response: any): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
