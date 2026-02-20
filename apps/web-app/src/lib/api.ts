const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'trader' | 'compliance';
  institutionId: string | null;
  mfaEnabled: boolean;
}

export interface LoginRequest { email: string; password: string; }
export interface LoginResponse { user: User; tokens: AuthTokens; mfaRequired?: boolean; mfaToken?: string; }
export interface RegisterRequest { email: string; password: string; firstName: string; lastName: string; }
export interface MFAVerifyRequest { mfaToken: string; code: string; }

export interface Institution {
  id: string;
  name: string;
  type: string;
  status: string;
  country: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  status: string;
  totalSupply: string;
  availableSupply: string;
  createdAt: string;
}

export interface CreateAssetRequest {
  name: string;
  type: string;
  description: string;
  totalSupply: number;
}

export interface RFQ {
  id: string;
  assetId: string;
  requesterInstitutionId: string;
  requesterUserId: string;
  side: 'buy' | 'sell';
  quantity: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface CreateRFQRequest {
  assetId: string;
  requesterInstitutionId: string;
  requesterUserId: string;
  side: 'buy' | 'sell';
  quantity: number;
}

class ApiClient {
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAccessToken();
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ title: 'Request failed' }));
      throw new ApiError(res.status, error.title ?? 'Request failed', error);
    }

    return res.json() as Promise<T>;
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async register(data: RegisterRequest): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyMFA(data: MFAVerifyRequest): Promise<{ user: User; tokens: AuthTokens }> {
    return this.request<{ user: User; tokens: AuthTokens }>('/api/v1/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    await this.request('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
  }

  async getMe(): Promise<{ data: User }> {
    return this.request<{ data: User }>('/api/v1/auth/me');
  }

  async getInstitutions(): Promise<{ data: Institution[]; total: number }> {
    return this.request<{ data: Institution[]; total: number }>('/api/v1/institutions');
  }

  async getInstitution(id: string): Promise<{ data: Institution }> {
    return this.request<{ data: Institution }>(`/api/v1/institutions/${id}`);
  }

  async getAssets(): Promise<{ data: Asset[]; total: number }> {
    return this.request<{ data: Asset[]; total: number }>('/api/v1/assets');
  }

  async getAsset(id: string): Promise<{ data: Asset }> {
    return this.request<{ data: Asset }>(`/api/v1/assets/${id}`);
  }

  async createAsset(data: CreateAssetRequest): Promise<{ data: Asset }> {
    return this.request<{ data: Asset }>('/api/v1/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRFQs(): Promise<{ rfqs: RFQ[]; total: number }> {
    return this.request<{ rfqs: RFQ[]; total: number }>('/api/v1/trading/rfq');
  }

  async createRFQ(data: CreateRFQRequest): Promise<RFQ> {
    return this.request<RFQ>('/api/v1/trading/rfq', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient();
