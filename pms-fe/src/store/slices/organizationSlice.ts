import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { OrganizationState, Worksite, Division } from '@/types/organization';
import { organizationService } from '@/services/organizationService';

// Initial state
const initialState: OrganizationState = {
  worksites: [],
  divisions: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchWorksites = createAsyncThunk(
  'organization/fetchWorksites',
  async (_, { rejectWithValue }) => {
    try {
      const worksites = await organizationService.getWorksites();
      return worksites;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch worksites');
    }
  }
);

export const fetchDivisions = createAsyncThunk(
  'organization/fetchDivisions',
  async (_, { rejectWithValue }) => {
    try {
      const divisions = await organizationService.getDivisions();
      return divisions;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch divisions');
    }
  }
);

export const fetchOrganizationData = createAsyncThunk(
  'organization/fetchAll',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      // Fetch both worksites and divisions
      const [worksites, divisions] = await Promise.all([
        organizationService.getWorksites(),
        organizationService.getDivisions(),
      ]);
      
      return { worksites, divisions };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch organization data');
    }
  }
);

// Organization slice
const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearOrganizationData: (state) => {
      state.worksites = [];
      state.divisions = [];
    },
    updateWorksite: (state, action: PayloadAction<Worksite>) => {
      const index = state.worksites.findIndex(ws => ws.id === action.payload.id);
      if (index !== -1) {
        state.worksites[index] = action.payload;
      } else {
        state.worksites.push(action.payload);
      }
    },
    updateDivision: (state, action: PayloadAction<Division>) => {
      const index = state.divisions.findIndex(div => div.id === action.payload.id);
      if (index !== -1) {
        state.divisions[index] = action.payload;
      } else {
        state.divisions.push(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch worksites
    builder
      .addCase(fetchWorksites.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorksites.fulfilled, (state, action) => {
        state.isLoading = false;
        state.worksites = action.payload;
      })
      .addCase(fetchWorksites.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch divisions
    builder
      .addCase(fetchDivisions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDivisions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.divisions = action.payload;
      })
      .addCase(fetchDivisions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch all organization data
    builder
      .addCase(fetchOrganizationData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrganizationData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.worksites = action.payload.worksites;
        state.divisions = action.payload.divisions;
      })
      .addCase(fetchOrganizationData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Action exports
export const {
  clearError,
  setLoading,
  clearOrganizationData,
  updateWorksite,
  updateDivision,
} = organizationSlice.actions;

// Selectors
export const selectOrganization = (state: { organization: OrganizationState }) => state.organization;
export const selectWorksites = (state: { organization: OrganizationState }) => state.organization.worksites;
export const selectDivisions = (state: { organization: OrganizationState }) => state.organization.divisions;
export const selectOrganizationLoading = (state: { organization: OrganizationState }) => state.organization.isLoading;
export const selectOrganizationError = (state: { organization: OrganizationState }) => state.organization.error;

// Helper selectors
export const selectWorksiteById = (id: number) => 
  (state: { organization: OrganizationState }) => 
    state.organization.worksites.find(ws => ws.id === id);

export const selectDivisionById = (id: number) => 
  (state: { organization: OrganizationState }) => 
    state.organization.divisions.find(div => div.id === id);

export const selectWorksitesForDivision = (divisionId: number) =>
  (state: { organization: OrganizationState }) => {
    const division = state.organization.divisions.find(div => div.id === divisionId);
    if (!division) return [];
    
    return state.organization.worksites.filter(ws => 
      division.worksites.includes(ws.id)
    );
  };

export default organizationSlice.reducer;