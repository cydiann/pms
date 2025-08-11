import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  RequestsState, 
  Request, 
  CreateRequestData, 
  UpdateRequestData, 
  ApprovalHistory, 
  ApprovalActionRequest,
  RequestStatus 
} from '@/types/requests';
import { RequestFilterParams } from '@/types/api';
import { requestService } from '@/services/requestService';

// Initial state
const initialState: RequestsState = {
  items: [],
  currentRequest: null,
  approvalHistory: [],
  isLoading: false,
  error: null,
  hasMore: true,
  page: 1,
};

// Async thunks
export const fetchRequests = createAsyncThunk(
  'requests/fetchRequests',
  async (params: RequestFilterParams = {}, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { requests: RequestsState };
      const currentPage = params.page || state.requests.page;
      
      const response = await requestService.getRequests({
        ...params,
        page: currentPage,
        page_size: params.page_size || 20,
      });
      
      return {
        requests: response.results,
        hasMore: response.next !== null,
        page: currentPage,
        isAppend: currentPage > 1,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch requests');
    }
  }
);

export const fetchRequest = createAsyncThunk(
  'requests/fetchRequest',
  async (id: number, { rejectWithValue }) => {
    try {
      const request = await requestService.getRequest(id);
      return request;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch request');
    }
  }
);

export const createRequest = createAsyncThunk(
  'requests/createRequest',
  async (data: CreateRequestData, { rejectWithValue }) => {
    try {
      const request = await requestService.createRequest(data);
      return request;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create request');
    }
  }
);

export const updateRequest = createAsyncThunk(
  'requests/updateRequest',
  async (data: UpdateRequestData, { rejectWithValue }) => {
    try {
      const request = await requestService.updateRequest(data);
      return request;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update request');
    }
  }
);

export const deleteRequest = createAsyncThunk(
  'requests/deleteRequest',
  async (id: number, { rejectWithValue }) => {
    try {
      await requestService.deleteRequest(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete request');
    }
  }
);

export const submitRequest = createAsyncThunk(
  'requests/submitRequest',
  async (id: number, { rejectWithValue }) => {
    try {
      const request = await requestService.submitRequest(id);
      return request;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to submit request');
    }
  }
);

export const performApprovalAction = createAsyncThunk(
  'requests/performApprovalAction',
  async ({ requestId, action }: { requestId: number; action: ApprovalActionRequest }, { rejectWithValue }) => {
    try {
      await requestService.performApprovalAction(requestId, action);
      // Fetch updated request after action
      const updatedRequest = await requestService.getRequest(requestId);
      return updatedRequest;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to perform action');
    }
  }
);

export const fetchApprovalHistory = createAsyncThunk(
  'requests/fetchApprovalHistory',
  async (requestId: number, { rejectWithValue }) => {
    try {
      const history = await requestService.getApprovalHistory(requestId);
      return history;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch approval history');
    }
  }
);

export const fetchPendingApprovals = createAsyncThunk(
  'requests/fetchPendingApprovals',
  async (_, { rejectWithValue }) => {
    try {
      const requests = await requestService.getPendingApprovals();
      return requests;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch pending approvals');
    }
  }
);

export const fetchTeamRequests = createAsyncThunk(
  'requests/fetchTeamRequests',
  async (params: RequestFilterParams = {}, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { requests: RequestsState };
      const currentPage = params.page || state.requests.page;
      
      const response = await requestService.getTeamRequests({
        ...params,
        page: currentPage,
        page_size: params.page_size || 20,
      });
      
      return {
        requests: response.results,
        hasMore: response.next !== null,
        page: currentPage,
        isAppend: currentPage > 1,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch team requests');
    }
  }
);

export const performBulkApproval = createAsyncThunk(
  'requests/performBulkApproval',
  async ({ requestIds, action, notes }: { 
    requestIds: number[]; 
    action: 'approve' | 'reject' | 'revise'; 
    notes?: string;
  }, { rejectWithValue }) => {
    try {
      await requestService.performBulkApproval(requestIds, { action, notes });
      return { requestIds, action };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to perform bulk action');
    }
  }
);

export const fetchPurchasingQueue = createAsyncThunk(
  'requests/fetchPurchasingQueue',
  async (params: RequestFilterParams = {}, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { requests: RequestsState };
      const currentPage = params.page || state.requests.page;
      
      const response = await requestService.getPurchasingQueue({
        ...params,
        page: currentPage,
        page_size: params.page_size || 20,
      });
      
      return {
        requests: response.results,
        hasMore: response.next !== null,
        page: currentPage,
        isAppend: currentPage > 1,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch purchasing queue');
    }
  }
);

export const updatePurchasingStatus = createAsyncThunk(
  'requests/updatePurchasingStatus',
  async ({ requestId, status, notes }: { 
    requestId: number; 
    status: 'purchasing' | 'ordered' | 'delivered'; 
    notes?: string;
  }, { rejectWithValue }) => {
    try {
      const request = await requestService.updatePurchasingStatus(requestId, { status, notes });
      return request;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update purchasing status');
    }
  }
);

// Requests slice
const requestsSlice = createSlice({
  name: 'requests',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearRequests: (state) => {
      state.items = [];
      state.page = 1;
      state.hasMore = true;
    },
    clearCurrentRequest: (state) => {
      state.currentRequest = null;
      state.approvalHistory = [];
    },
    updateRequestInList: (state, action: PayloadAction<Request>) => {
      const index = state.items.findIndex(req => req.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    removeRequestFromList: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(req => req.id !== action.payload);
    },
    resetPagination: (state) => {
      state.page = 1;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    // Fetch requests
    builder
      .addCase(fetchRequests.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.isAppend) {
          state.items = [...state.items, ...action.payload.requests];
        } else {
          state.items = action.payload.requests;
        }
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
      })
      .addCase(fetchRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch single request
    builder
      .addCase(fetchRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRequest = action.payload;
      })
      .addCase(fetchRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create request
    builder
      .addCase(createRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
        state.currentRequest = action.payload;
      })
      .addCase(createRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update request
    builder
      .addCase(updateRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.items.findIndex(req => req.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentRequest?.id === action.payload.id) {
          state.currentRequest = action.payload;
        }
      })
      .addCase(updateRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete request
    builder
      .addCase(deleteRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = state.items.filter(req => req.id !== action.payload);
        if (state.currentRequest?.id === action.payload) {
          state.currentRequest = null;
        }
      })
      .addCase(deleteRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Submit request
    builder
      .addCase(submitRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(submitRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.items.findIndex(req => req.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentRequest?.id === action.payload.id) {
          state.currentRequest = action.payload;
        }
      })
      .addCase(submitRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Perform approval action
    builder
      .addCase(performApprovalAction.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(performApprovalAction.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.items.findIndex(req => req.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentRequest?.id === action.payload.id) {
          state.currentRequest = action.payload;
        }
      })
      .addCase(performApprovalAction.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch approval history
    builder
      .addCase(fetchApprovalHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchApprovalHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.approvalHistory = action.payload;
      })
      .addCase(fetchApprovalHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch team requests
    builder
      .addCase(fetchTeamRequests.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTeamRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.isAppend) {
          state.items = [...state.items, ...action.payload.requests];
        } else {
          state.items = action.payload.requests;
        }
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
      })
      .addCase(fetchTeamRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Perform bulk approval
    builder
      .addCase(performBulkApproval.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(performBulkApproval.fulfilled, (state, action) => {
        state.isLoading = false;
        // Remove processed requests from the list (they will be refetched)
        state.items = state.items.filter(req => !action.payload.requestIds.includes(req.id));
      })
      .addCase(performBulkApproval.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch purchasing queue
    builder
      .addCase(fetchPurchasingQueue.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPurchasingQueue.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.isAppend) {
          state.items = [...state.items, ...action.payload.requests];
        } else {
          state.items = action.payload.requests;
        }
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
      })
      .addCase(fetchPurchasingQueue.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update purchasing status
    builder
      .addCase(updatePurchasingStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updatePurchasingStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.items.findIndex(req => req.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentRequest?.id === action.payload.id) {
          state.currentRequest = action.payload;
        }
      })
      .addCase(updatePurchasingStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Action exports
export const {
  clearError,
  setLoading,
  clearRequests,
  clearCurrentRequest,
  updateRequestInList,
  removeRequestFromList,
  resetPagination,
} = requestsSlice.actions;

// Selectors
export const selectRequests = (state: { requests: RequestsState }) => state.requests;
export const selectRequestItems = (state: { requests: RequestsState }) => state.requests.items;
export const selectCurrentRequest = (state: { requests: RequestsState }) => state.requests.currentRequest;
export const selectApprovalHistory = (state: { requests: RequestsState }) => state.requests.approvalHistory;
export const selectRequestsLoading = (state: { requests: RequestsState }) => state.requests.isLoading;
export const selectRequestsError = (state: { requests: RequestsState }) => state.requests.error;
export const selectHasMoreRequests = (state: { requests: RequestsState }) => state.requests.hasMore;

// Helper selectors
export const selectRequestsByStatus = (status: RequestStatus) => 
  (state: { requests: RequestsState }) => 
    state.requests.items.filter(req => req.status === status);

export const selectDraftRequests = (state: { requests: RequestsState }) => 
  state.requests.items.filter(req => req.status === 'draft');

export const selectPendingRequests = (state: { requests: RequestsState }) => 
  state.requests.items.filter(req => req.status === 'pending' || req.status === 'in_review');

// New selectors for Phase 3
export const selectTeamRequestItems = (state: { requests: RequestsState }) => state.requests.items;
export const selectPurchasingQueueItems = (state: { requests: RequestsState }) => state.requests.items;

export const selectApprovedRequests = (state: { requests: RequestsState }) => 
  state.requests.items.filter(req => req.status === 'approved');

export const selectPurchasingRequests = (state: { requests: RequestsState }) => 
  state.requests.items.filter(req => req.status === 'purchasing');

export const selectOrderedRequests = (state: { requests: RequestsState }) => 
  state.requests.items.filter(req => req.status === 'ordered');

export const selectDeliveredRequests = (state: { requests: RequestsState }) => 
  state.requests.items.filter(req => req.status === 'delivered');

export default requestsSlice.reducer;