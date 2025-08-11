export interface Worksite {
  id: number;
  address: string;
  city: string;
  country: string;
  chief: number | null;
  chief_name?: string;
}

export interface Division {
  id: number;
  name: string;
  created_by: number;
  created_by_name?: string;
  worksites: number[];
}

export interface OrganizationState {
  worksites: Worksite[];
  divisions: Division[];
  isLoading: boolean;
  error: string | null;
}