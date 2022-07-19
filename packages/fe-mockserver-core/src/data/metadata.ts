import { parse } from '@sap-ux/edmx-parser';
import { convert } from '@sap-ux/annotation-converter';
import type {
    Action,
    ActionImport,
    ConvertedMetadata,
    EntitySet,
    EntityType,
    NavigationProperty,
    RawMetadata,
    Singleton
} from '@sap-ux/vocabularies-types';

type NameAndNav = {
    name: string;
    entitySet: EntitySet | Singleton;
    navigation: NavigationProperty;
    partner?: NavigationProperty;
};

/**
 *
 */
export class ODataMetadata {
    public static async parse(edmx: string, metadataUrl: string, ETag?: string): Promise<ODataMetadata> {
        const metadata: RawMetadata = parse(edmx);
        const converterMetadata: ConvertedMetadata = convert(metadata);
        return new ODataMetadata(converterMetadata, metadata, metadataUrl, edmx, ETag);
    }

    public getEdmx() {
        return this.edmx;
    }
    public getMetadataUrl(): string {
        return this.metadataUrl;
    }

    public readonly typeToEntityMapping: object = {};
    public readonly ETag: string | undefined;
    public readonly metadataUrl: string;
    protected readonly metadata: ConvertedMetadata;
    protected readonly parserMetadata: RawMetadata;

    private constructor(
        metadata: ConvertedMetadata,
        parserMetadata: RawMetadata,
        metadataUrl: string,
        private edmx: string,
        ETag?: string
    ) {
        this.metadata = metadata;
        this.parserMetadata = parserMetadata;
        this.metadataUrl = metadataUrl;
        this.ETag = ETag;
    }

    public getVersion(): string {
        return this.metadata.version === '1.0' ? '2.0' : '4.0';
    }

    public getEntitySet(entitySetName: string): EntitySet | undefined {
        return this.metadata.entitySets.find((entitySet) => entitySet.name === entitySetName);
    }

    public getSingleton(singletonName: string): EntitySet {
        return this.metadata.singletons.find((singleton) => singleton.name === singletonName) as any;
    }

    public getEntitySets(): EntitySet[] {
        return this.metadata.entitySets;
    }
    public getSingletons(): Singleton[] {
        return this.metadata.singletons || [];
    }

    public getEntityType(entityTypeName: string): EntityType | undefined {
        return this.metadata.entityTypes.find((entityType) => entityType.name === entityTypeName);
    }

    public getEntitySetByType(entityTypeName: string): EntitySet | undefined {
        return this.metadata.entitySets.find((entitySet) => entitySet.entityTypeName === entityTypeName);
    }
    public getActionByFQN(actionFQN: string): Action | undefined {
        return this.metadata.actions.find((action) => action.fullyQualifiedName === actionFQN);
    }

    public getActionImportByFQN(actionImportFQN: string): ActionImport | undefined {
        return this.metadata.actionImports.find((actionImport) => actionImport.fullyQualifiedName === actionImportFQN);
    }

    public getEntityContainerPath(): string {
        return this.parserMetadata.schema.entityContainer.fullyQualifiedName;
    }

    public isDraftEntity(entitySet: EntitySet): boolean {
        return (
            entitySet?.annotations?.Common?.DraftRoot !== undefined ||
            entitySet?.annotations?.Common?.DraftNode !== undefined
        );
    }

    public isStickyEntity(entitySet: EntitySet): boolean {
        return entitySet?.annotations?.Session?.StickySessionSupported !== undefined;
    }
    public isDraftRoot(entitySet: EntitySet): boolean {
        return entitySet?.annotations?.Common?.DraftRoot !== undefined;
    }

    public resolvePath(path: string): any {
        return this.metadata.resolvePath(path);
    }

    public findInDescendant(entitySet: EntitySet | Singleton, targetEntitySet: EntitySet, path: NameAndNav[]) {
        // Check if we are a descendent
        let found = false;
        Object.keys(entitySet.navigationPropertyBinding).forEach((navName) => {
            const subET = entitySet.navigationPropertyBinding[navName];
            const navInvolved = entitySet.entityType.navigationProperties.find((nav) => nav.name === navName);
            let partnerNav;
            if (navInvolved?.partner) {
                partnerNav = navInvolved.targetType.navigationProperties.find(
                    (nav) => nav.name === navInvolved.partner
                );
            }
            if (subET === targetEntitySet && navInvolved) {
                found = true;
                path.push({
                    name: navName,
                    entitySet: subET,
                    navigation: navInvolved,
                    partner: partnerNav
                });
            }
        });
        if (!found) {
            // Look into children
            Object.keys(entitySet.navigationPropertyBinding).forEach((navName) => {
                const subET = entitySet.navigationPropertyBinding[navName];
                const navInvolved = entitySet.entityType.navigationProperties.find((nav) => nav.name === navName);
                let partnerNav;
                if (navInvolved?.partner) {
                    partnerNav = navInvolved.targetType.navigationProperties.find(
                        (nav) => nav.name === navInvolved.partner
                    );

                    const subPath = path.concat([
                        {
                            name: navName,
                            entitySet: subET,
                            navigation: navInvolved,
                            partner: partnerNav
                        }
                    ]);
                    if (this.findInDescendant(subET, targetEntitySet, subPath)) {
                        // found it in descendent
                        found = true;
                        subPath.slice(path.length).forEach((subPathPart) => {
                            path.push(subPathPart);
                        });
                    }
                }
            });
        }
        return found;
    }

    public resolveDraftRoot(entitySet: EntitySet) {
        let found = false;
        let foundPath!: NameAndNav[];
        let rootEntitySet!: EntitySet;
        this.metadata.entitySets.forEach((et) => {
            if (this.isDraftRoot(et) && !found) {
                const resolvePath: any[] = [];
                found = this.findInDescendant(et, entitySet, resolvePath);
                if (found) {
                    foundPath = resolvePath.concat();
                    rootEntitySet = et;
                }
            }
        });
        return {
            found,
            entitySet: rootEntitySet,
            path: foundPath
        };
    }

    public resolveAncestors(entitySet: EntitySet) {
        let found = false;
        let foundPath!: NameAndNav[];
        let rootEntitySet!: EntitySet;
        this.metadata.entitySets.forEach((et) => {
            if (!found) {
                const resolvePath: any[] = [];
                found = this.findInDescendant(et, entitySet, resolvePath);
                if (found) {
                    foundPath = resolvePath.concat();
                    rootEntitySet = et;
                }
            }
        });
        return {
            found,
            entitySet: rootEntitySet,
            path: foundPath
        };
    }

    public getParentEntitySetName(sourceEntitySet: EntitySet) {
        const { found, path, entitySet } = this.resolveAncestors(sourceEntitySet);
        if (found) {
            if (path.length === 1 && entitySet) {
                return entitySet.name;
            } else {
                return path[path.length - 1].entitySet.name;
            }
        }
    }

    public getETag() {
        return this.ETag;
    }
    public getKeys(dataLine: any, entityType: EntityType): Record<string, string | number | boolean> {
        const keys = entityType.keys;
        const keyValues: any = {};
        keys.forEach((keyProp) => {
            keyValues[keyProp.name] = dataLine[keyProp.name];
        });

        return keyValues;
    }
}
