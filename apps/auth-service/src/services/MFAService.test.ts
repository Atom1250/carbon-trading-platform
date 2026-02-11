import { MFAService } from './MFAService';
import { AuthenticationError } from '@libs/errors';

jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(),
  totp: {
    verify: jest.fn(),
  },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const mockGenerateSecret = speakeasy.generateSecret as jest.Mock;
const mockTotpVerify = speakeasy.totp.verify as jest.Mock;
const mockQRCodeToDataURL = QRCode.toDataURL as jest.Mock;

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function makeMockDb(queryResults: unknown[][] = []) {
  let callIndex = 0;
  return {
    query: jest.fn().mockImplementation(() => Promise.resolve(queryResults[callIndex++] ?? [])),
    transaction: jest.fn(),
    healthCheck: jest.fn(),
    end: jest.fn(),
  };
}

describe('MFAService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setup', () => {
    it('should generate a secret and return QR code data URL', async () => {
      const fakeSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/Carbon%20Platform:user?secret=JBSWY3DPEHPK3PXP',
      };
      mockGenerateSecret.mockReturnValue(fakeSecret);
      mockQRCodeToDataURL.mockResolvedValue('data:image/png;base64,abc123');

      const db = makeMockDb([[]]);  // UPDATE users result
      const service = new MFAService(db as never);
      const result = await service.setup(USER_ID);

      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.qrCodeDataUrl).toBe('data:image/png;base64,abc123');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET mfa_secret'),
        ['JBSWY3DPEHPK3PXP', USER_ID],
      );
    });
  });

  describe('verifyTOTP', () => {
    it('should return true for a valid TOTP code', async () => {
      const db = makeMockDb([[{ mfa_secret: 'JBSWY3DPEHPK3PXP' }]]);
      mockTotpVerify.mockReturnValue(true);

      const service = new MFAService(db as never);
      const result = await service.verifyTOTP(USER_ID, '123456');

      expect(result).toBe(true);
      expect(mockTotpVerify).toHaveBeenCalledWith(
        expect.objectContaining({ secret: 'JBSWY3DPEHPK3PXP', encoding: 'base32', token: '123456', window: 1 }),
      );
    });

    it('should return false for an invalid TOTP code', async () => {
      const db = makeMockDb([[{ mfa_secret: 'JBSWY3DPEHPK3PXP' }]]);
      mockTotpVerify.mockReturnValue(false);

      const service = new MFAService(db as never);
      const result = await service.verifyTOTP(USER_ID, '000000');

      expect(result).toBe(false);
    });

    it('should return false when user has no MFA secret', async () => {
      const db = makeMockDb([[{ mfa_secret: null }]]);
      const service = new MFAService(db as never);
      const result = await service.verifyTOTP(USER_ID, '123456');

      expect(result).toBe(false);
      expect(mockTotpVerify).not.toHaveBeenCalled();
    });

    it('should return false when user is not found', async () => {
      const db = makeMockDb([[]]);
      const service = new MFAService(db as never);
      const result = await service.verifyTOTP(USER_ID, '123456');

      expect(result).toBe(false);
    });
  });

  describe('enable', () => {
    it('should set has_enabled_mfa=true on valid TOTP', async () => {
      const db = makeMockDb([
        [{ mfa_secret: 'JBSWY3DPEHPK3PXP' }],  // verifyTOTP query
        [],                                        // UPDATE users
      ]);
      mockTotpVerify.mockReturnValue(true);

      const service = new MFAService(db as never);
      await service.enable(USER_ID, '123456');

      const updateCall = (db.query as jest.Mock).mock.calls[1] as [string, string[]];
      expect(updateCall[0]).toContain('UPDATE users SET has_enabled_mfa = true');
      expect(updateCall[1][0]).toBe(USER_ID);
    });

    it('should throw AuthenticationError on invalid TOTP', async () => {
      const db = makeMockDb([[{ mfa_secret: 'JBSWY3DPEHPK3PXP' }]]);
      mockTotpVerify.mockReturnValue(false);

      const service = new MFAService(db as never);
      await expect(service.enable(USER_ID, '000000')).rejects.toThrow(AuthenticationError);
    });
  });
});
