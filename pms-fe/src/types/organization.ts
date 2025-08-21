// WorkSite Interface - matches Django Worksite model + WorksiteSerializer
export interface WorkSite {
  id: number;
  address: string;
  city: string;
  country: string;
  chief?: number; // chief user ID
  chief_name?: string; // from serializer: chief.get_full_name
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Division Interface - matches Django Division model + DivisionSerializer
export interface Division {
  id: number;
  name: string;
  created_by: number;
  created_by_name: string; // from serializer: created_by.get_full_name
  worksites: number[]; // many-to-many relationship IDs
}

// WorkSite Creation/Update DTOs
export interface CreateWorkSiteDto {
  address: string;
  city: string;
  country?: string; // defaults to 'Turkey'
  chief?: number;
}

export interface UpdateWorkSiteDto extends Partial<CreateWorkSiteDto> {
  id: number;
}

// Division Creation/Update DTOs
export interface CreateDivisionDto {
  name: string;
  worksites?: number[]; // optional many-to-many
}

export interface UpdateDivisionDto extends Partial<CreateDivisionDto> {
  id: number;
}

// Filters
export interface WorkSiteFilters {
  city?: string[];
  country?: string[];
  search?: string;
}

export interface DivisionFilters {
  worksites?: number[];
  search?: string;
}

// List Items for UI display with additional computed fields
export interface WorkSiteListItem {
  id: number;
  address: string;
  city: string;
  country: string;
  chief_name?: string;
  total_employees?: number; // computed field
  total_divisions?: number; // computed field
}

export interface DivisionListItem {
  id: number;
  name: string;
  created_by_name: string;
  worksite_count?: number; // computed field
  total_employees?: number; // computed field
}

// Organization Statistics
export interface OrganizationStats {
  total_worksites: number;
  total_divisions: number;
  total_employees: number;
  employees_by_worksite: Record<string, number>;
  employees_by_division: Record<string, number>;
}