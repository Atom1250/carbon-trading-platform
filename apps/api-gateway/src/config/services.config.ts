export interface ServiceConfig {
  url: string;
  basePath?: string;
  healthPath: string;
  timeout: number;
}

export function getServiceRegistry(): Record<string, ServiceConfig> {
  return {
    auth: {
      url: process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3002',
      basePath: '/auth',
      healthPath: '/health',
      timeout: 30_000,
    },
    institutions: {
      url: process.env['INSTITUTION_SERVICE_URL'] ?? 'http://localhost:3003',
      basePath: '/institutions',
      healthPath: '/health',
      timeout: 30_000,
    },
    projects: {
      url: process.env['INSTITUTION_SERVICE_URL'] ?? 'http://localhost:3003',
      basePath: '/projects',
      healthPath: '/health',
      timeout: 30_000,
    },
    fundingRequests: {
      url: process.env['INSTITUTION_SERVICE_URL'] ?? 'http://localhost:3003',
      basePath: '/funding-requests',
      healthPath: '/health',
      timeout: 30_000,
    },
    assets: {
      url: process.env['ASSET_SERVICE_URL'] ?? 'http://localhost:3004',
      basePath: '/assets',
      healthPath: '/health',
      timeout: 30_000,
    },
    compliance: {
      url: process.env['COMPLIANCE_SERVICE_URL'] ?? 'http://localhost:3005',
      healthPath: '/health',
      timeout: 30_000,
    },
    trading: {
      url: process.env['TRADING_SERVICE_URL'] ?? 'http://localhost:3006',
      healthPath: '/health',
      timeout: 30_000,
    },
    ledger: {
      url: process.env['LEDGER_SERVICE_URL'] ?? 'http://localhost:3007',
      healthPath: '/health',
      timeout: 30_000,
    },
    wallet: {
      url: process.env['LEDGER_SERVICE_URL'] ?? 'http://localhost:3007',
      basePath: '/wallet',
      healthPath: '/health',
      timeout: 30_000,
    },
  };
}
