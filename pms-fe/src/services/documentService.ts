import apiClient from './apiClient';
import { API_ENDPOINTS } from '../constants/api';
import { PaginatedResponse, DocumentQueryParams } from '../types/api';

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
  async uploadFile(presignedUrl: string, file: File): Promise<boolean> {
    try {
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error uploading file:', error);
      return false;
    }
  }

  // Complete upload flow: create document -> upload file -> confirm upload
  async completeUpload(data: CreateDocumentDto, file: File): Promise<ProcurementDocument> {
    // 1. Create document record and get presigned URL
    const createResponse = await this.createDocument(data);
    
    // 2. Upload file to MinIO
    const uploadSuccess = await this.uploadFile(createResponse.upload_url, file);
    if (!uploadSuccess) {
      throw new Error('Failed to upload file to storage');
    }
    
    // 3. Confirm upload completion
    const confirmResponse = await this.confirmUpload(createResponse.id);
    if (confirmResponse.status !== 'success') {
      throw new Error('Failed to confirm upload');
    }
    
    // 4. Return updated document
    return await this.getDocument(createResponse.id);
  }

  // Download file from MinIO
  async downloadFile(id: string): Promise<void> {
    const { download_url, file_name } = await this.getDownloadUrl(id);
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = download_url;
    link.download = file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Utility methods
  getDocumentTypeDisplay(type: string): string {
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

  validateFileType(file: File): boolean {
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
    
    return allowedTypes.includes(file.type);
  }

  validateFileSize(file: File, maxSize: number = 10485760): boolean {
    return file.size <= maxSize; // Default 10MB
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