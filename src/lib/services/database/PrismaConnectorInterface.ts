import { ConnectionType, MnestixConnection } from '../../../../prisma/generated/client';
import type { InfrastructureFormData } from 'app/[locale]/settings/_components/mnestix-infrastructure/InfrastructureTypes';
import { InfrastructureWithRelations } from 'lib/services/database/InfrastructureMappedTypes';
import { DataSourceFormData, MnestixConnectionWithTypes } from 'lib/services/database/PrismaConnector';

export interface IPrismaConnector {
    /**
     * Retrieves all infrastructures with their related data
     */
    getInfrastructures(): Promise<InfrastructureWithRelations[]>;

    /**
     * Retrieves connection URLs by connection type
     */
    getConnectionDataByTypeAction(type: ConnectionType): Promise<{ infrastructureName: string; url: string }[]>;

    /**
     * Creates a new infrastructure
     */
    createInfrastructure(infrastructureData: InfrastructureFormData): Promise<{ id: string; name: string }>;

    /**
     * Updates an existing infrastructure
     */
    updateInfrastructure(infrastructureData: InfrastructureFormData): Promise<{ id: string; name: string }>;

    /**
     * Deletes an infrastructure by ID
     */
    deleteInfrastructureAction(infrastructureId: string): Promise<void>;

    /**
     * Retrieves all connections with their type relations
     */
    getConnectionData(): Promise<MnestixConnectionWithTypes[]>;

    /**
     * Creates or updates connection data
     */
    upsertConnectionDataAction(formDataInput: DataSourceFormData[]): Promise<void>;

    /**
     * Retrieves all repository configuration groups (connections with AAS_REPOSITORY type that have a name)
     */
    getRepositoryConfigurationGroups(): Promise<MnestixConnection[]>;

    /**
     * Retrieves a repository configuration by its name
     */
    getRepositoryConfigurationGroupByName(name: string): Promise<MnestixConnection | null>;

    /**
     * Retrieves a repository configuration by its URL
     */
    getRepositoryConfigurationByRepositoryUrl(repositoryUrl: string): Promise<MnestixConnection | null>;
}
