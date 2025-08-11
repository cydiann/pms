import { apiService } from './api';
import { Worksite, Division } from '@/types/organization';
import { API_ENDPOINTS } from '@/constants/api';

export class OrganizationService {
  /**
   * Get all worksites
   */
  async getWorksites(): Promise<Worksite[]> {
    return apiService.get<Worksite[]>(API_ENDPOINTS.ORGANIZATION.WORKSITES);
  }

  /**
   * Get single worksite by ID
   */
  async getWorksite(id: number): Promise<Worksite> {
    return apiService.get<Worksite>(`${API_ENDPOINTS.ORGANIZATION.WORKSITES}${id}/`);
  }

  /**
   * Get all divisions
   */
  async getDivisions(): Promise<Division[]> {
    return apiService.get<Division[]>(API_ENDPOINTS.ORGANIZATION.DIVISIONS);
  }

  /**
   * Get single division by ID
   */
  async getDivision(id: number): Promise<Division> {
    return apiService.get<Division>(`${API_ENDPOINTS.ORGANIZATION.DIVISIONS}${id}/`);
  }

  /**
   * Get worksites for a specific division
   */
  async getWorksitesForDivision(divisionId: number): Promise<Worksite[]> {
    const division = await this.getDivision(divisionId);
    const worksites = await this.getWorksites();
    
    return worksites.filter(worksite => division.worksites.includes(worksite.id));
  }
}

export const organizationService = new OrganizationService();