import { Contract, JsonRpcProvider, Wallet, parseUnits } from 'ethers';
import { createLogger } from '@libs/logger';
import { ServiceUnavailableError } from '@libs/errors';
import type { BlockchainConfig, MintResult, BurnResult } from '../types/asset.types.js';

const logger = createLogger('blockchain-service');

// Minimal ABI for PlatformAssets contract methods we interact with
const PLATFORM_ASSETS_ABI = [
  'function mint(address to, uint256 tokenId, uint256 amount, string tokenURI, bytes data)',
  'function burn(address from, uint256 tokenId, uint256 amount)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function approveKYC(address account)',
  'function isKYCApproved(address account) view returns (bool)',
];

export class BlockchainService {
  private readonly contract: Contract;
  private readonly wallet: Wallet;

  constructor(config: BlockchainConfig) {
    const provider = new JsonRpcProvider(config.rpcUrl);
    this.wallet = new Wallet(config.privateKey, provider);
    this.contract = new Contract(config.contractAddress, PLATFORM_ASSETS_ABI, this.wallet);
  }

  async mintToken(
    to: string,
    tokenId: string,
    amount: string,
    metadataUri: string,
  ): Promise<MintResult> {
    logger.info('Minting token', { to, tokenId, amount, metadataUri });

    try {
      const tx = await this.contract.mint(
        to,
        BigInt(tokenId),
        parseUnits(amount, 8),
        metadataUri,
        '0x',
      );
      const receipt = await tx.wait();

      logger.info('Token minted successfully', { txHash: receipt.hash });
      return { txHash: receipt.hash };
    } catch (err) {
      logger.error('Failed to mint token', { error: err });
      throw new ServiceUnavailableError('blockchain', { cause: err });
    }
  }

  async burnToken(
    from: string,
    tokenId: number,
    amount: string,
  ): Promise<BurnResult> {
    logger.info('Burning token', { from, tokenId, amount });

    try {
      const tx = await this.contract.burn(
        from,
        BigInt(tokenId),
        parseUnits(amount, 8),
      );
      const receipt = await tx.wait();

      logger.info('Token burned successfully', { txHash: receipt.hash });
      return { txHash: receipt.hash };
    } catch (err) {
      logger.error('Failed to burn token', { error: err });
      throw new ServiceUnavailableError('blockchain', { cause: err });
    }
  }

  async getBalance(address: string, tokenId: number): Promise<string> {
    try {
      const balance = await this.contract.balanceOf(address, BigInt(tokenId));
      return balance.toString();
    } catch (err) {
      logger.error('Failed to get balance', { error: err });
      throw new ServiceUnavailableError('blockchain', { cause: err });
    }
  }

  async approveKYC(address: string): Promise<MintResult> {
    logger.info('Approving KYC', { address });

    try {
      const tx = await this.contract.approveKYC(address);
      const receipt = await tx.wait();

      logger.info('KYC approved', { txHash: receipt.hash });
      return { txHash: receipt.hash };
    } catch (err) {
      logger.error('Failed to approve KYC', { error: err });
      throw new ServiceUnavailableError('blockchain', { cause: err });
    }
  }

  async isKYCApproved(address: string): Promise<boolean> {
    try {
      return await this.contract.isKYCApproved(address);
    } catch (err) {
      logger.error('Failed to check KYC status', { error: err });
      throw new ServiceUnavailableError('blockchain', { cause: err });
    }
  }
}
