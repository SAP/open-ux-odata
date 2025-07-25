import type { DataAccessInterface } from './common';

/**
 * Registry for managing cross-service communication in the mockserver.
 * Allows services to access entity interfaces from other services in a controlled manner.
 */
export class ServiceRegistry {
    private readonly services: Map<string, DataAccessInterface> = new Map();

    /**
     * Register a service with its DataAccess instance
     * @param serviceName - The name/path of the service
     * @param dataAccess - The DataAccess instance for this service
     */
    public registerService(serviceName: string, dataAccess: DataAccessInterface): void {
        this.services.set(serviceName, dataAccess);
    }

    /**
     * Get a DataAccess instance for a specific service
     * @param serviceName - The name/path of the service
     * @returns The DataAccess instance or undefined if not found
     */
    public getService(serviceName: string): DataAccessInterface | undefined {
        return this.services.get(serviceName);
    }

    /**
     * Get all registered service names
     * @returns Array of service names
     */
    public getServiceNames(): string[] {
        return Array.from(this.services.keys());
    }
}
