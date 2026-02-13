import { ServiceUnavailableError } from '@libs/errors';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock ethers before importing BlockchainService
const mockMint = jest.fn();
const mockBurn = jest.fn();
const mockBalanceOf = jest.fn();
const mockApproveKYC = jest.fn();
const mockIsKYCApproved = jest.fn();

jest.mock('ethers', () => ({
  JsonRpcProvider: jest.fn(),
  Wallet: jest.fn(),
  Contract: jest.fn().mockImplementation(() => ({
    mint: mockMint,
    burn: mockBurn,
    balanceOf: mockBalanceOf,
    approveKYC: mockApproveKYC,
    isKYCApproved: mockIsKYCApproved,
  })),
  parseUnits: jest.fn((value: string, decimals: number) => BigInt(Math.round(Number(value) * 10 ** decimals))),
}));

import { BlockchainService } from './BlockchainService.js';

const CONFIG = {
  rpcUrl: 'http://localhost:8545',
  privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
};

const RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const TX_HASH = '0xabc123def456789012345678901234567890123456789012345678901234abcd';

function mockTxReceipt(hash: string = TX_HASH) {
  return { hash };
}

describe('BlockchainService', () => {
  let service: BlockchainService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BlockchainService(CONFIG);
  });

  describe('mintToken', () => {
    it('should call contract.mint with correct args and return txHash', async () => {
      const receipt = mockTxReceipt();
      mockMint.mockResolvedValue({ wait: jest.fn().mockResolvedValue(receipt) });

      const result = await service.mintToken(RECIPIENT, '1', '1000', 'ipfs://metadata');

      expect(mockMint).toHaveBeenCalledWith(
        RECIPIENT,
        BigInt(1),
        expect.anything(), // parseUnits result
        'ipfs://metadata',
        '0x',
      );
      expect(result.txHash).toBe(TX_HASH);
    });

    it('should wait for transaction receipt', async () => {
      const waitFn = jest.fn().mockResolvedValue(mockTxReceipt());
      mockMint.mockResolvedValue({ wait: waitFn });

      await service.mintToken(RECIPIENT, '1', '1000', 'ipfs://metadata');

      expect(waitFn).toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableError on contract failure', async () => {
      mockMint.mockRejectedValue(new Error('Transaction reverted'));

      await expect(service.mintToken(RECIPIENT, '1', '1000', 'ipfs://metadata'))
        .rejects.toThrow(ServiceUnavailableError);
    });

    it('should include original error as cause', async () => {
      const originalError = new Error('Insufficient gas');
      mockMint.mockRejectedValue(originalError);

      try {
        await service.mintToken(RECIPIENT, '1', '1000', 'ipfs://metadata');
        fail('Expected ServiceUnavailableError');
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceUnavailableError);
        expect((err as ServiceUnavailableError).cause).toBe(originalError);
      }
    });
  });

  describe('burnToken', () => {
    it('should call contract.burn with correct args and return txHash', async () => {
      const receipt = mockTxReceipt();
      mockBurn.mockResolvedValue({ wait: jest.fn().mockResolvedValue(receipt) });

      const result = await service.burnToken(RECIPIENT, 1, '500');

      expect(mockBurn).toHaveBeenCalledWith(
        RECIPIENT,
        BigInt(1),
        expect.anything(), // parseUnits result
      );
      expect(result.txHash).toBe(TX_HASH);
    });

    it('should throw ServiceUnavailableError on contract failure', async () => {
      mockBurn.mockRejectedValue(new Error('Not owner nor approved'));

      await expect(service.burnToken(RECIPIENT, 1, '500'))
        .rejects.toThrow(ServiceUnavailableError);
    });
  });

  describe('getBalance', () => {
    it('should return balance as string', async () => {
      mockBalanceOf.mockResolvedValue(BigInt(100000000000));

      const balance = await service.getBalance(RECIPIENT, 1);

      expect(mockBalanceOf).toHaveBeenCalledWith(RECIPIENT, BigInt(1));
      expect(balance).toBe('100000000000');
    });

    it('should return 0 when no balance', async () => {
      mockBalanceOf.mockResolvedValue(BigInt(0));

      const balance = await service.getBalance(RECIPIENT, 1);

      expect(balance).toBe('0');
    });

    it('should throw ServiceUnavailableError on failure', async () => {
      mockBalanceOf.mockRejectedValue(new Error('Network error'));

      await expect(service.getBalance(RECIPIENT, 1))
        .rejects.toThrow(ServiceUnavailableError);
    });
  });

  describe('approveKYC', () => {
    it('should call contract.approveKYC and return txHash', async () => {
      const receipt = mockTxReceipt();
      mockApproveKYC.mockResolvedValue({ wait: jest.fn().mockResolvedValue(receipt) });

      const result = await service.approveKYC(RECIPIENT);

      expect(mockApproveKYC).toHaveBeenCalledWith(RECIPIENT);
      expect(result.txHash).toBe(TX_HASH);
    });

    it('should throw ServiceUnavailableError on failure', async () => {
      mockApproveKYC.mockRejectedValue(new Error('Not admin'));

      await expect(service.approveKYC(RECIPIENT))
        .rejects.toThrow(ServiceUnavailableError);
    });
  });

  describe('isKYCApproved', () => {
    it('should return true when KYC approved', async () => {
      mockIsKYCApproved.mockResolvedValue(true);

      const result = await service.isKYCApproved(RECIPIENT);

      expect(mockIsKYCApproved).toHaveBeenCalledWith(RECIPIENT);
      expect(result).toBe(true);
    });

    it('should return false when KYC not approved', async () => {
      mockIsKYCApproved.mockResolvedValue(false);

      const result = await service.isKYCApproved(RECIPIENT);

      expect(result).toBe(false);
    });

    it('should throw ServiceUnavailableError on failure', async () => {
      mockIsKYCApproved.mockRejectedValue(new Error('Network error'));

      await expect(service.isKYCApproved(RECIPIENT))
        .rejects.toThrow(ServiceUnavailableError);
    });
  });
});
