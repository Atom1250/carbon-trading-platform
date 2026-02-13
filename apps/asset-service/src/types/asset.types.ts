export type AssetType = 'carbon_credit' | 'loan_portion';
export type AssetStatus = 'draft' | 'pending_verification' | 'verified' | 'minted' | 'suspended';

export interface Asset {
  id: string;
  institutionId: string;
  assetType: AssetType;
  name: string;
  description: string | null;
  status: AssetStatus;
  tokenId: string | null;
  mintingTxHash: string | null;
  mintedAt: Date | null;
  vintage: number | null;
  standard: string | null;
  geography: string | null;
  metadataUri: string | null;
  totalSupply: string;
  availableSupply: string;
  retiredSupply: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssetDTO {
  institutionId: string;
  assetType: AssetType;
  name: string;
  description?: string;
  vintage?: number;
  standard?: string;
  geography?: string;
  totalSupply: number;
}

export interface UpdateAssetDTO {
  name?: string;
  description?: string;
  status?: AssetStatus;
  vintage?: number;
  standard?: string;
  geography?: string;
  metadataUri?: string;
}

export interface ListAssetsQuery {
  assetType?: AssetType;
  status?: AssetStatus;
  institutionId?: string;
  limit: number;
  offset: number;
}

export interface AssetListResult {
  assets: Asset[];
  total: number;
}

export type VerificationDecision = 'approved' | 'rejected';

export interface VerificationRecord {
  id: string;
  assetId: string;
  decision: VerificationDecision;
  verifiedBy: string;
  notes: string | null;
  createdAt: Date;
}

export interface ApproveAssetDTO {
  notes?: string;
}

export interface RejectAssetDTO {
  notes: string;
}

export interface BlockchainConfig {
  rpcUrl: string;
  privateKey: string;
  contractAddress: string;
}

export interface MintResult {
  txHash: string;
}

export interface BurnResult {
  txHash: string;
}
