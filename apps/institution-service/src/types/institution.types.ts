export type InstitutionTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';
export type InstitutionStatus = 'pending' | 'active' | 'suspended' | 'closed';

export interface Institution {
  id: string;
  name: string;
  legalName: string;
  registrationNumber: string | null;
  tier: InstitutionTier;
  status: InstitutionStatus;
  countryCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInstitutionDTO {
  name: string;
  legalName: string;
  registrationNumber?: string;
  tier: InstitutionTier;
  countryCode: string;
}

export interface UpdateInstitutionDTO {
  tier?: InstitutionTier;
  status?: InstitutionStatus;
}

export interface ListInstitutionsQuery {
  status?: InstitutionStatus;
  tier?: InstitutionTier;
  countryCode?: string;
  limit: number;
  offset: number;
}

export interface InstitutionListResult {
  institutions: Institution[];
  total: number;
}
