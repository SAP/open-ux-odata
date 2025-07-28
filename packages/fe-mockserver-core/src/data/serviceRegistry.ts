import type { DataAccessInterface } from './common';

/**
 * Registry for managing cross-service communication in the mockserver.
 * Allows services to access entity interfaces from other services in a controlled manner.
 */
export class ServiceRegistry {
    private readonly services: Map<string, DataAccessInterface> = new Map();
    private readonly aliases: Map<string, string> = new Map();

    /**
     * Register a service with its DataAccess instance.
     * @param serviceName - The name/path of the service
     * @param dataAccess - The DataAccess instance for this service
     * @param alias - Optional alias for easier reference
     */
    public registerService(serviceName: string, dataAccess: DataAccessInterface, alias?: string): void {
        this.services.set(serviceName, dataAccess);
        if (alias) {
            this.aliases.set(alias, serviceName);
        }
    }

    /**
     * Get a DataAccess instance for a specific service.
     * @param serviceNameOrAlias - The name/path or alias of the service
     * @returns The DataAccess instance or undefined if not found
     */
    public getService(serviceNameOrAlias: string): DataAccessInterface | undefined {
        // First try to get by alias
        const serviceName = this.aliases.get(serviceNameOrAlias);
        if (serviceName) {
            return this.services.get(serviceName);
        }
        // Fallback to direct service name lookup
        return this.services.get(serviceNameOrAlias);
    }

    /**
     * Get all registered service names.
     * @returns Array of service names
     */
    public getServiceNames(): string[] {
        return Array.from(this.services.keys());
    }

    /**
     * Get all registered service aliases.
     * @returns Array of service aliases
     */
    public getServiceAliases(): string[] {
        return Array.from(this.aliases.keys());
    }

    /**
     * Get a formatted list of all services with their aliases (if any).
     * @returns String showing all services and their aliases
     */
    public getServicesWithAliases(): string {
        const serviceNames = Array.from(this.services.keys());
        return serviceNames
            .map((serviceName) => {
                // Find alias for this service
                const alias = Array.from(this.aliases.entries()).find(([, name]) => name === serviceName)?.[0];
                return alias ? `${serviceName} (alias: ${alias})` : serviceName;
            })
            .join(', ');
    }
}
