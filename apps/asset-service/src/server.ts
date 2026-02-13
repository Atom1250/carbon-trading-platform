import { loadConfig } from '@libs/config';
import { createLogger } from '@libs/logger';
import { DatabaseClient } from '@libs/database';
import { createApp } from './app.js';
import { AssetService } from './services/AssetService.js';
import { VerificationService } from './services/VerificationService.js';
import { BlockchainService } from './services/BlockchainService.js';
import { MintingService } from './services/MintingService.js';
import { RetirementService } from './services/RetirementService.js';

const logger = createLogger('asset-service');

const config = loadConfig();
const db = new DatabaseClient({ connectionString: config.DATABASE_URL, max: config.DATABASE_POOL_MAX });
const assetService = new AssetService(db);
const verificationService = new VerificationService(db);

const blockchainRpcUrl = process.env['BLOCKCHAIN_RPC_URL'];
const blockchainPrivateKey = process.env['BLOCKCHAIN_PRIVATE_KEY'];
const blockchainContractAddress = process.env['BLOCKCHAIN_CONTRACT_ADDRESS'];

const blockchainService = blockchainRpcUrl && blockchainPrivateKey && blockchainContractAddress
  ? new BlockchainService({ rpcUrl: blockchainRpcUrl, privateKey: blockchainPrivateKey, contractAddress: blockchainContractAddress })
  : undefined;

if (blockchainService) {
  logger.info('Blockchain service initialized');
} else {
  logger.warn('Blockchain service not configured — minting/retirement will be unavailable');
}

const mintingService = blockchainService ? new MintingService(db, blockchainService) : undefined;
const retirementService = blockchainService ? new RetirementService(db, blockchainService) : undefined;

const app = createApp({
  assetService,
  verificationService,
  blockchainService,
  mintingService: mintingService as never,
  retirementService: retirementService as never,
  corsOrigins: config.CORS_ORIGINS,
});
const port = config.PORT ?? 3004;

app.listen(port, () => {
  logger.info('Asset service started', { port });
});
