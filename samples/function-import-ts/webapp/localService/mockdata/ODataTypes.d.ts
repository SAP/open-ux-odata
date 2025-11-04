export type NavPropTo<T> = T;

// ====== Entity Types ======

// Type definitions for RootEntity
export type RootEntity = {
    ID: number;
    name?: string;
    description?: string;
    IsActiveEntity: boolean;
    HasActiveEntity: boolean;
    HasDraftEntity: boolean;
    DraftAdministrativeData?: NavPropTo<DraftAdministrativeData>;
    SiblingEntity?: NavPropTo<RootEntity>;
};
export type RootEntityKeys = {
    ID: number;
    IsActiveEntity: boolean;
};

// Type definitions for DraftAdministrativeData
export type DraftAdministrativeData = {
    DraftUUID: string;
    CreationDateTime?: string;
    CreatedByUser?: string;
    DraftIsCreatedByMe?: boolean;
    LastChangeDateTime?: string;
    LastChangedByUser?: string;
    InProcessByUser?: string;
    DraftIsProcessedByMe?: boolean;
};
export type DraftAdministrativeDataKeys = {
    DraftUUID: string;
};
