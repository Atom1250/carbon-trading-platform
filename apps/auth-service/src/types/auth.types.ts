export interface TokenPayload {
  userId: string;
  institutionId: string;
  role: string;
  tokenId: string;
}

export interface UserRow {
  id: string;
  institution_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  has_enabled_mfa: boolean;
  mfa_secret: string | null;
}

export interface SafeUser {
  id: string;
  institutionId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  mfaEnabled: boolean;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
  requiresMFA: boolean;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export interface RequestMeta {
  ipAddress: string;
  userAgent: string;
}
