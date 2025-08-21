import apiClient from './apiClient';
import { API_ENDPOINTS } from '../constants/api';
import { PaginatedResponse } from '../types/api';
import {
  WorkSite,
  Division,
  WorkSiteListItem,
  DivisionListItem,
  OrganizationFilters,
  OrganizationStats,
} from '../types/organization';

class OrganizationService {
  // Get all worksites
  async getWorksites(): Promise<WorkSite[]> {
    console.log('OrganizationService: Getting worksites from:', API_ENDPOINTS.ORGANIZATION.WORKSITES);
    const result = await apiClient.get<PaginatedResponse<WorkSite>>(API_ENDPOINTS.ORGANIZATION.WORKSITES);
    console.log('OrganizationService: Worksites response:', result);
    console.log('OrganizationService: Worksites count:', result.results?.length || 0);
    return result.results || [];
  }

  // Get single worksite details
  async getWorksite(id: number): Promise<WorkSite> {
    return await apiClient.get<WorkSite>(`${API_ENDPOINTS.ORGANIZATION.WORKSITES}${id}/`);
  }

  // Get all divisions
  async getDivisions(): Promise<Division[]> {
    console.log('OrganizationService: Getting divisions from:', API_ENDPOINTS.ORGANIZATION.DIVISIONS);
    const result = await apiClient.get<PaginatedResponse<Division>>(API_ENDPOINTS.ORGANIZATION.DIVISIONS);
    console.log('OrganizationService: Divisions response:', result);
    console.log('OrganizationService: Divisions count:', result.results?.length || 0);
    return result.results || [];
  }

  // Get single division details
  async getDivision(id: number): Promise<Division> {
    return await apiClient.get<Division>(`${API_ENDPOINTS.ORGANIZATION.DIVISIONS}${id}/`);
  }

  // Create new worksite
  async createWorksite(data: { address: string; city: string; country?: string; chief?: number }): Promise<WorkSite> {
    console.log('OrganizationService: Creating worksite with data:', data);
    try {
      const result = await apiClient.post<WorkSite>(API_ENDPOINTS.ORGANIZATION.WORKSITES, {
        ...data,
        country: data.country || 'Turkey' // Default country
      });
      console.log('OrganizationService: Worksite created successfully:', result);
      return result;
    } catch (error) {
      console.error('OrganizationService: Failed to create worksite:', error);
      throw error;
    }
  }

  // Update worksite
  async updateWorksite(id: number, data: Partial<{ address: string; city: string; country: string; chief?: number }>): Promise<WorkSite> {
    console.log('OrganizationService: Updating worksite', id, 'with data:', data);
    try {
      const result = await apiClient.put<WorkSite>(`${API_ENDPOINTS.ORGANIZATION.WORKSITES}${id}/`, data);
      console.log('OrganizationService: Worksite updated successfully:', result);
      return result;
    } catch (error) {
      console.error('OrganizationService: Failed to update worksite:', error);
      throw error;
    }
  }

  // Delete worksite
  async deleteWorksite(id: number): Promise<void> {
    console.log('OrganizationService: Deleting worksite:', id);
    try {
      await apiClient.delete<void>(`${API_ENDPOINTS.ORGANIZATION.WORKSITES}${id}/`);
      console.log('OrganizationService: Worksite deleted successfully');
    } catch (error) {
      console.error('OrganizationService: Failed to delete worksite:', error);
      throw error;
    }
  }

  // Get worksites with user count (computed)
  async getWorksitesWithStats(): Promise<Array<WorkSite & { user_count: number; active_requests: number }>> {
    const worksites = await this.getWorksites();
    
    // In a real implementation, this would be handled by the backend
    // For now, we'll return the worksites with zero counts
    return worksites.map(worksite => ({
      ...worksite,
      user_count: 0, // Would be computed by backend
      active_requests: 0, // Would be computed by backend
    }));
  }

  // Get divisions with associated worksite count
  async getDivisionsWithStats(): Promise<Array<Division & { worksite_count: number }>> {
    const divisions = await this.getDivisions();
    
    return divisions.map(division => ({
      ...division,
      worksite_count: division.worksites ? division.worksites.length : 0,
    }));
  }

  // Get organization statistics (for admin dashboard)
  async getOrganizationStats(): Promise<OrganizationStats> {
    try {
      // In a real implementation, this would be a dedicated backend endpoint
      const [worksites, divisions] = await Promise.all([
        this.getWorksites(),
        this.getDivisions(),
      ]);

      return {
        total_worksites: worksites.length,
        total_divisions: divisions.length,
        worksites_with_chief: worksites.filter(w => w.chief).length,
        worksites_by_country: this.groupWorksitesByCountry(worksites),
        users_by_worksite: {}, // Would be computed by backend
        active_requests_by_worksite: {}, // Would be computed by backend
      };
    } catch (error) {
      console.error('Error loading organization stats:', error);
      throw error;
    }
  }

  // Utility methods
  private groupWorksitesByCountry(worksites: WorkSite[]): Record<string, number> {
    return worksites.reduce((acc, worksite) => {
      const country = worksite.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  // Get worksites for a specific user (based on their access)
  async getUserWorksites(userId: number): Promise<WorkSite[]> {
    // In a real implementation, this would filter worksites based on user permissions
    return await this.getWorksites();
  }

  // Get worksite display name
  getWorksiteDisplayName(worksite: WorkSite): string {
    return `${worksite.city}, ${worksite.country}`;
  }

  // Get worksite chief name
  getWorksiteChiefName(worksite: WorkSite): string {
    return worksite.chief_name || 'No Chief Assigned';
  }

  // Check if user can access worksite
  canUserAccessWorksite(worksite: WorkSite, userWorksiteId: number, isAdmin: boolean): boolean {
    // Admin can access all worksites
    if (isAdmin) return true;
    
    // Users can only access their own worksite
    return worksite.id === userWorksiteId;
  }

  // Format worksite address
  formatWorksiteAddress(worksite: WorkSite): string {
    return `${worksite.address}\n${worksite.city}, ${worksite.country}`;
  }

  // Get division display name
  getDivisionDisplayName(division: Division): string {
    return division.name;
  }

  // Get division created by name
  getDivisionCreatedByName(division: Division): string {
    return division.created_by_name || 'Unknown';
  }

  // Get worksites for division
  getDivisionWorksites(division: Division): WorkSite[] {
    return division.worksites || [];
  }

  // Check if division has worksites
  hasDivisionWorksites(division: Division): boolean {
    return Boolean(division.worksites && division.worksites.length > 0);
  }

  // Filter worksites by criteria
  filterWorksites(worksites: WorkSite[], filters: OrganizationFilters): WorkSite[] {
    let filtered = [...worksites];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(w => 
        w.city.toLowerCase().includes(search) ||
        w.country.toLowerCase().includes(search) ||
        w.address.toLowerCase().includes(search) ||
        (w.chief_name && w.chief_name.toLowerCase().includes(search))
      );
    }

    if (filters.country && filters.country.length > 0) {
      filtered = filtered.filter(w => filters.country!.includes(w.country));
    }

    if (filters.has_chief !== undefined) {
      filtered = filtered.filter(w => filters.has_chief ? Boolean(w.chief) : !w.chief);
    }

    return filtered;
  }

  // Filter divisions by criteria
  filterDivisions(divisions: Division[], filters: OrganizationFilters): Division[] {
    let filtered = [...divisions];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(d => 
        d.name.toLowerCase().includes(search) ||
        (d.created_by_name && d.created_by_name.toLowerCase().includes(search))
      );
    }

    return filtered;
  }

  // Get unique countries from worksites
  getAvailableCountries(worksites: WorkSite[]): string[] {
    const countries = new Set<string>();
    worksites.forEach(w => {
      if (w.country) {
        countries.add(w.country);
      }
    });
    return Array.from(countries).sort();
  }

  // Get worksite options for dropdowns
  getWorksiteOptions(worksites: WorkSite[]): Array<{ value: number; label: string }> {
    return worksites.map(w => ({
      value: w.id,
      label: this.getWorksiteDisplayName(w),
    }));
  }

  // Get division options for dropdowns
  getDivisionOptions(divisions: Division[]): Array<{ value: number; label: string }> {
    return divisions.map(d => ({
      value: d.id,
      label: d.name,
    }));
  }
}

const organizationService = new OrganizationService();
export default organizationService;