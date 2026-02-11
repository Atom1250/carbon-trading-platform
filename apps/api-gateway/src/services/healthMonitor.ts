import axios from 'axios';
import { createLogger } from '@libs/logger';
import type { ServiceConfig } from '../config/services.config.js';

const logger = createLogger('api-gateway');

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}

export class HealthMonitor {
  constructor(private readonly serviceRegistry: Record<string, ServiceConfig>) {}

  async checkService(serviceName: string): Promise<ServiceHealth> {
    const service = this.serviceRegistry[serviceName];
    if (!service) {
      return { service: serviceName, status: 'unhealthy', error: 'Service not configured' };
    }

    const startTime = Date.now();

    try {
      await axios.get(`${service.url}${service.healthPath}`, { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      return { service: serviceName, status: 'healthy', responseTime };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      logger.warn(`Service health check failed: ${serviceName}`, { error: message });

      return { service: serviceName, status: 'unhealthy', error: message };
    }
  }

  async checkAllServices(): Promise<ServiceHealth[]> {
    const serviceNames = Object.keys(this.serviceRegistry);
    return Promise.all(serviceNames.map((name) => this.checkService(name)));
  }
}
