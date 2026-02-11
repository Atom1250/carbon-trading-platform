export interface ServiceConfig {
  url: string;
  healthPath: string;
  timeout: number;
}

export function getServiceRegistry(): Record<string, ServiceConfig> {
  return {
    auth: {
      url: process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3002',
      healthPath: '/health',
      timeout: 30_000,
    },
    institutions: {
      url: process.env['INSTITUTION_SERVICE_URL'] ?? 'http://localhost:3003',
      healthPath: '/health',
      timeout: 30_000,
    },
  };
}
