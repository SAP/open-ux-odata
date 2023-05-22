import type {
    Action,
    EntitySet,
    EntityType,
    NavigationProperty,
    Property,
    ReferentialConstraint,
    Singleton
} from '@sap-ux/vocabularies-types';
import type { ILogger } from '@ui5/logger';
import cloneDeep from 'lodash.clonedeep';
import type { ServiceConfig } from '../api';
import type { IFileLoader } from '../index';
import { getLogger } from '../logger';
import type { FileBasedMockData, KeyDefinitions } from '../mockdata/fileBasedMockData';
import { MockEntityContainer } from '../mockdata/mockEntityContainer';
import type {
    AggregatesTransformation,
    GroupByTransformation,
    OrderByProp,
    TopLevelParameters,
    TransformationDefinition
} from '../request/applyParser';
import type { FilterExpression } from '../request/filterParser';
import type { ExpandDefinition, QueryPath } from '../request/odataRequest';
import ODataRequest from '../request/odataRequest';
import type { DataAccessInterface, EntitySetInterface, PartialReferentialConstraint } from './common';
import { getData, _getDateTimeOffset } from './common';
import { ContainedDataEntitySet } from './entitySets/ContainedDataEntitySet';
import { DraftMockEntitySet } from './entitySets/draftEntitySet';
import { MockDataEntitySet } from './entitySets/entitySet';
import { StickyMockEntitySet } from './entitySets/stickyEntitySet';
import type { ODataMetadata } from './metadata';

/**
 *
 */
export class DataAccess implements DataAccessInterface {
    protected readonly mockDataRootFolder: string;
    public debug: boolean;
    public log: ILogger;
    protected readonly strictKeyMode: boolean;
    protected readonly contextBasedIsolation: boolean;
    protected entitySets: Record<string, MockDataEntitySet> = {};
    protected stickyEntitySets: StickyMockEntitySet[] = [];
    protected generateMockData: boolean;

    public constructor(
        private service: ServiceConfig,
        private metadata: ODataMetadata,
        public fileLoader: IFileLoader
    ) {
        this.mockDataRootFolder = service.mockdataPath;
        this.metadata = metadata;
        this.debug = !!service.debug;
        this.log = getLogger('server:ux-fe-mockserver', this.debug);

        this.strictKeyMode = !!service.strictKeyMode;
        this.generateMockData = !!service.generateMockData;
        this.contextBasedIsolation = !!service.contextBasedIsolation;
        this.fileLoader = fileLoader;
        if (this.generateMockData) {
            this.log.info('Missing mockdata will be generated');
        }
        this.initializeMockData();
    }

    public isV4(): boolean {
        return this.metadata.getVersion() !== '2.0';
    }

    private initializeMockData() {
        // Preload the mock entityset asynchronously
        this.metadata.getEntitySets().forEach((entitySet) => {
            this.getMockEntitySet(entitySet.name, this.generateMockData).catch((error) => {
                this.log.info(`Error while loading mockdata for entityset ${entitySet.name}: ${error}`);
            });
        });
        this.metadata.getSingletons().forEach((entitySet) => {
            this.getMockEntitySet(entitySet.name, this.generateMockData).catch((error) => {
                this.log.info(`Error while loading mockdata for singleton ${entitySet.name}: ${error}`);
            });
        });
    }

    public reloadData(newMetadata?: ODataMetadata) {
        if (newMetadata) {
            this.metadata = newMetadata;
        }
        this.entitySets = {};
        this.initializeMockData();
    }

    public async getMockEntitySet(
        entityTypeName?: string,
        generateMockData: boolean = false,
        containedEntityType?: EntityType,
        containedData?: any
    ): Promise<EntitySetInterface> {
        if (containedEntityType) {
            const mockEntitySet = new ContainedDataEntitySet(containedEntityType, containedData, this);
            return mockEntitySet.readyPromise;
        } else if (entityTypeName && !this.entitySets[entityTypeName]) {
            const entitySet = this.metadata.getEntitySet(entityTypeName);
            const singleton = this.metadata.getSingleton(entityTypeName);
            const entityType = this.metadata.getEntityType(entityTypeName);
            let mockEntitySet: MockDataEntitySet;
            if (entitySet && this.metadata.isDraftEntity(entitySet)) {
                this.log.info(`Creating draft entity for ${entitySet?.name}`);
                mockEntitySet = new DraftMockEntitySet(this.mockDataRootFolder, entitySet, this, generateMockData);
            } else if (entitySet && this.metadata.isStickyEntity(entitySet)) {
                this.log.info(`Creating sticky entity for ${entitySet?.name}`);
                mockEntitySet = new StickyMockEntitySet(this.mockDataRootFolder, entitySet, this, generateMockData);
                this.stickyEntitySets.push(mockEntitySet as StickyMockEntitySet);
            } else {
                this.log.info(`Creating entity for ${(entitySet || entityType)?.name}`);
                mockEntitySet = new MockDataEntitySet(
                    this.mockDataRootFolder,
                    entitySet || singleton || entityType,
                    this,
                    generateMockData
                );
            }
            this.entitySets[entityTypeName] = mockEntitySet;
        }
        return this.entitySets[entityTypeName!].readyPromise;
    }

    public async performAction(odataRequest: ODataRequest, actionData?: object): Promise<any> {
        // if it's a bound action we need to look for the action type
        const rootEntitySet = this.metadata.getEntitySet(odataRequest.queryPath[0].path);
        if (rootEntitySet) {
            let currentEntityType = rootEntitySet.entityType;
            let currentEntitySet: EntitySet | Singleton = rootEntitySet;
            let i = 1;
            for (i; i < odataRequest.queryPath.length - 1; i++) {
                const queryPart = odataRequest.queryPath[i].path;
                const targetNavProp = currentEntityType.navigationProperties.find(
                    (navProp) => navProp.name === queryPart
                );
                if (targetNavProp) {
                    currentEntityType = targetNavProp.targetType;
                    if (currentEntitySet) {
                        currentEntitySet = currentEntitySet.navigationPropertyBinding[queryPart];
                    }
                }
            }
            const entitySetName = currentEntitySet ? currentEntitySet.name : currentEntityType.name;
            const actionName = odataRequest.queryPath[i] ? odataRequest.queryPath[i].path : undefined; // Double as action name
            if (actionName && actionName.length > 0) {
                const fqActionName = `${actionName}(${currentEntityType.fullyQualifiedName})`;
                const actionDefinition = this.metadata.getActionByFQN(fqActionName);
                if (actionDefinition) {
                    return (await this.getMockEntitySet(entitySetName)).executeAction(
                        actionDefinition,
                        actionData,
                        odataRequest,
                        odataRequest.queryPath[i - 1].keys
                    );
                }
                const collecfqActionName = `${actionName}(Collection(${currentEntityType.fullyQualifiedName}))`;
                const collecactionDefinition = this.metadata.getActionByFQN(collecfqActionName);
                if (collecactionDefinition) {
                    return (await this.getMockEntitySet(entitySetName)).executeAction(
                        collecactionDefinition,
                        actionData,
                        odataRequest,
                        odataRequest.queryPath[0].keys
                    );
                }
            }
        } else {
            // Unbound action
            const actionName = odataRequest.queryPath[0].path;
            const entityContainerPath = this.metadata.getEntityContainerPath();

            const actionDefinition: Action | undefined = this.isV4()
                ? this.metadata.getActionImportByFQN(`${entityContainerPath}/${actionName}`)?.action
                : this.metadata.getActionByFQN(`${entityContainerPath}/${actionName}`);

            if (actionDefinition) {
                if (actionDefinition.sourceType !== '') {
                    const targetEntitySet = this.metadata.getEntitySetByType(actionDefinition.sourceType);
                    if (targetEntitySet) {
                        let outData: any = (await this.getMockEntitySet(targetEntitySet.name)).executeAction(
                            actionDefinition,
                            Object.assign({}, actionData),
                            odataRequest,
                            {}
                        );
                        if (!this.isV4()) {
                            const enrichElement = (entitySet: EntitySet, dataLine: any) => {
                                const keyValues: Record<string, string> = {};
                                entitySet.entityType.keys.forEach((key) => {
                                    keyValues[key.name] = dataLine[key.name];
                                });
                                this.addV2Metadata(entitySet, keyValues, dataLine);

                                return dataLine;
                            };

                            // Enrich data with __metadata for v2
                            if (Array.isArray(outData)) {
                                outData = outData.map((element) => {
                                    return enrichElement(targetEntitySet, element);
                                });
                            } else if (outData != null) {
                                outData = enrichElement(targetEntitySet, outData);
                            }
                        }
                        return outData;
                    }
                } else if (
                    this.stickyEntitySets.some((stickyEntitySet) => stickyEntitySet.isDiscardAction(actionDefinition))
                ) {
                    // Special case for sticky discard action that might need to be changed
                    for (const entitySet of this.stickyEntitySets) {
                        await entitySet.executeAction(
                            actionDefinition,
                            actionData,
                            odataRequest,
                            odataRequest.queryPath[0].keys
                        );
                    }
                    return true;
                } else {
                    // Treat this as a normal unbound action
                    // There is no entitySet linked to it, handle it in the EntityContainer.js potentially as executeAction
                    return (
                        await MockEntityContainer.read(
                            this.mockDataRootFolder,
                            odataRequest.tenantId,
                            this.fileLoader,
                            this
                        )
                    )?.executeAction!(
                        actionDefinition,
                        Object.assign({}, actionData),
                        odataRequest.queryPath[0].keys || {},
                        odataRequest
                    );
                }
            }
        }
        return null;
    }

    public async getNavigationPropertyKeys(
        data: any,
        navPropDetail: any,
        currentEntityType: EntityType,
        currentEntitySet: EntitySet | Singleton | undefined,
        currentKeys: Record<string, string>,
        tenantId: string,
        forCreate = false
    ): Promise<Record<string, string>> {
        const mockEntitySet = await this.getMockEntitySet(currentEntityType.name);
        let referentialConstraints = await mockEntitySet.getMockData(tenantId).getReferentialConstraints(navPropDetail);
        if (!referentialConstraints) {
            referentialConstraints = navPropDetail.referentialConstraint;
        }
        if (referentialConstraints && referentialConstraints.length > 0) {
            const dataArray = Array.isArray(data) ? data : [data];
            dataArray.forEach((navigationData) => {
                referentialConstraints!.forEach((refConstr: PartialReferentialConstraint) => {
                    currentKeys[refConstr.targetProperty] = navigationData[refConstr.sourceProperty];
                });
                if (
                    currentEntitySet &&
                    navigationData.hasOwnProperty('IsActiveEntity') &&
                    ((currentEntitySet?.annotations?.Common as any)?.DraftNode ||
                        (currentEntitySet?.annotations?.Common as any)?.DraftRoot)
                ) {
                    currentKeys['IsActiveEntity'] = navigationData.IsActiveEntity;
                }
                if (
                    navigationData.hasOwnProperty('IsActiveEntity') &&
                    (navPropDetail.targetType.annotations?.Common?.DraftNode ||
                        navPropDetail.targetType.annotations?.Common?.DraftRoot)
                ) {
                    currentKeys['IsActiveEntity'] = navigationData.IsActiveEntity;
                }
            });
        } else {
            // Try to find a back link (a nav property going back to the original entityType)
            const originalData = cloneDeep(data);
            const backNav: NavigationProperty | undefined = (
                navPropDetail.targetType as EntityType
            ).navigationProperties.find((targetNavProp) => {
                if (navPropDetail.partner) {
                    return targetNavProp.name === navPropDetail.partner;
                } else {
                    return targetNavProp.targetTypeName === currentEntityType.fullyQualifiedName;
                }
            });
            if (backNav?.referentialConstraint && backNav.referentialConstraint.length > 0) {
                backNav.referentialConstraint.forEach((refConstr: ReferentialConstraint) => {
                    if (originalData[refConstr.targetProperty] !== undefined) {
                        currentKeys[refConstr.sourceProperty] = originalData[refConstr.targetProperty];
                        delete originalData[refConstr.targetProperty];
                    }
                });
                navPropDetail.targetType.keys.forEach((propKey: Property) => {
                    if (
                        propKey.name === 'IsActiveEntity' &&
                        currentKeys[propKey.name] === undefined &&
                        Object.hasOwnProperty.call(originalData, propKey.name) &&
                        (!forCreate || !propKey.annotations?.Core?.Computed)
                    ) {
                        currentKeys[propKey.name] = originalData[propKey.name];
                        delete originalData[propKey.name];
                    }
                });
            } else if (!this.strictKeyMode) {
                navPropDetail.targetType.keys.forEach((propKey: Property) => {
                    if (
                        Object.hasOwnProperty.call(originalData, propKey.name) &&
                        (!forCreate || !propKey.annotations?.Core?.Computed)
                    ) {
                        currentKeys[propKey.name] = originalData[propKey.name];
                        delete originalData[propKey.name];
                    }
                });
                // If there is no key or only draft stuff
                if (
                    Object.keys(currentKeys).length === 0 ||
                    (Object.keys(currentKeys).length === 1 && currentKeys.hasOwnProperty('IsActiveEntity'))
                ) {
                    // If we still don't have anything, try to get the keys from the current entity that are properties in the target
                    currentEntityType.keys.forEach((propKey) => {
                        if (
                            navPropDetail.targetType.entityProperties.find(
                                (prop: Property) => prop.name === propKey.name
                            ) &&
                            originalData[propKey.name] !== undefined
                        ) {
                            currentKeys[propKey.name] = originalData[propKey.name];
                            delete originalData[propKey.name];
                        }
                    });
                }
            }
        }
        return currentKeys;
    }

    async getExpandData(
        currentEntitySet: EntitySet | Singleton | undefined,
        entityType: EntityType,
        expandNavProp: string,
        data: any,
        requestExpandObject: Record<string, ExpandDefinition>,
        tenantId: string,
        previousEntitySet: EntitySet | Singleton | undefined,
        visitedPaths: string[],
        odataRequest: ODataRequest
    ) {
        if (data === null) {
            return;
        }
        const navProp = entityType.navigationProperties.find((entityNavProp) => entityNavProp.name === expandNavProp);
        visitedPaths = visitedPaths.concat();
        visitedPaths.push(expandNavProp);
        let targetEntitySet: EntitySet | Singleton | undefined;
        if (navProp && currentEntitySet && currentEntitySet.navigationPropertyBinding[expandNavProp]) {
            targetEntitySet = currentEntitySet.navigationPropertyBinding[expandNavProp];
        } else if (previousEntitySet && previousEntitySet.navigationPropertyBinding[visitedPaths.join('/')]) {
            targetEntitySet = previousEntitySet.navigationPropertyBinding[visitedPaths.join('/')];
        }
        if (targetEntitySet) {
            const navEntitySet = await this.getMockEntitySet(targetEntitySet.name);
            const dataArray = Array.isArray(data) ? data : [data];
            for (const dataLine of dataArray) {
                const currentKeys = await this.getNavigationPropertyKeys(
                    dataLine,
                    navProp,
                    entityType,
                    targetEntitySet,
                    {},
                    odataRequest.tenantId
                );
                if (navProp && !navProp.containsTarget) {
                    let expandData = dataLine[expandNavProp];
                    if (!expandData) {
                        expandData = navEntitySet.performGET(currentKeys, navProp.isCollection, tenantId, odataRequest);
                        dataLine[expandNavProp] = expandData;
                    }
                    const expandDetail = requestExpandObject[expandNavProp];
                    if (expandDetail.expand && Object.keys(expandDetail.expand).length > 0) {
                        await Promise.all(
                            Object.keys(expandDetail.expand).map(async (subExpandNavProp) => {
                                return this.getExpandData(
                                    targetEntitySet,
                                    navProp.targetType,
                                    subExpandNavProp,
                                    expandData,
                                    expandDetail.expand,
                                    tenantId,
                                    targetEntitySet,
                                    [],
                                    odataRequest
                                );
                            })
                        );
                    }
                }
            }
        } else {
            return data[expandNavProp];
        }
    }

    public getMetadata(): ODataMetadata {
        return this.metadata;
    }

    private apply$Select(expandDefinition: ExpandDefinition, expandData: any[], entityType: EntityType) {
        // preprocess the selected property names
        let selectedPropertyNames = Object.keys(expandDefinition.properties);
        if (selectedPropertyNames.includes('*') || selectedPropertyNames.length === 0) {
            // select all
            selectedPropertyNames = ['*'];
        } else {
            // select the specified properties plus all key properties
            selectedPropertyNames = selectedPropertyNames
                .map((property) => property.split('/', 1)[0]) // reduce paths to their first segment ($select=foo/bar ~> $select=foo), accepting too much data in the response for simplicity
                .concat(...entityType.keys.map((key) => key.name)); // always include key properties
        }

        const expandedNavProps = Object.keys(expandDefinition.expand).reduce((navigationProperties, navPropName) => {
            const navigationProperty = entityType.navigationProperties.find((navProp) => navProp.name === navPropName);
            if (navigationProperty) {
                navigationProperties.push(navigationProperty);
            }
            return navigationProperties;
        }, [] as NavigationProperty[]);

        const processedNavProps: NavigationProperty[] = [];

        for (const element of expandData) {
            // the element might be null (if it is a 1:1 navigation property)
            if (element === null || element === undefined) {
                continue;
            }

            // if all properties are requested ("*") keep everything else delete unwanted properties
            if (!selectedPropertyNames.includes('*')) {
                Object.keys(element)
                    .filter((propertyName) => !selectedPropertyNames.includes(propertyName))
                    .forEach((propertyName) => {
                        delete element[propertyName];
                    });
            }
            // Delete internal tihngs just in case
            const internalProperties = ['$parent', '$children', '$rootDistance'];
            Object.keys(element)
                .filter((propertyName) => internalProperties.includes(propertyName))
                .forEach((propertyName) => {
                    delete element[propertyName];
                });

            for (const navProp of expandedNavProps) {
                processedNavProps.push(navProp);

                if (expandDefinition.expand[navProp.name].removeFromResult) {
                    // delete the navigation property, it was expanded for internal reasons only
                    delete element[navProp.name];
                } else {
                    const subElement = element[navProp.name];
                    const subExpand = expandDefinition.expand[navProp.name];
                    if (Array.isArray(subElement)) {
                        this.apply$Select(subExpand, subElement, navProp.targetType);
                    } else {
                        this.apply$Select(subExpand, [subElement], navProp.targetType);
                    }
                }
            }

            // we may still want to remove navProp that were inline and not requested
            for (const navigationProperty of entityType.navigationProperties) {
                if (
                    !processedNavProps.includes(navigationProperty) &&
                    navigationProperty.name !== 'DraftAdministrativeData'
                ) {
                    delete element[navigationProperty.name];
                }
            }
        }
    }

    public async getData(odataRequest: ODataRequest, dontClone: boolean = false): Promise<any> {
        this.log.info(`Retrieving data for ${JSON.stringify(odataRequest.queryPath)}`);
        let currentEntitySet: EntitySet | Singleton | undefined;
        let previousEntitySet: EntitySet | Singleton | undefined;
        let currentEntityType!: EntityType;
        let returnPropertyType: Property | undefined;
        let visitedPaths: string[] = [];
        let targetContainedData: any;
        let targetContainedEntityType: EntityType | undefined;
        let rootEntitySet = this.metadata.getEntitySet(odataRequest.queryPath[0].path);
        if (!rootEntitySet) {
            rootEntitySet = this.metadata.getSingleton(odataRequest.queryPath[0].path);
        }
        let isCount = false;
        let data: any = await odataRequest.queryPath.reduce(
            async (inData: Promise<any>, queryPathPart: QueryPath, index: number) => {
                const innerData = await inData;
                let currentKeys: Record<string, any> = queryPathPart.keys || {};
                let asArray: boolean = Object.keys(currentKeys).length === 0;
                if (queryPathPart.path === '$count') {
                    isCount = true;
                    return innerData;
                }
                if ((!currentEntityType || innerData === null) && index > 0) {
                    if (innerData === null) {
                        if (currentEntityType) {
                            const navPropDetail = currentEntityType.navigationProperties.find(
                                (navProp) => navProp.name === queryPathPart.path
                            );
                            asArray = !!(asArray && navPropDetail && navPropDetail.isCollection);
                        }
                        return asArray ? [] : null;
                    }
                    return innerData;
                }
                if (!currentEntityType) {
                    // First level if entity set, then it's navigation properties
                    currentEntitySet = this.metadata.getEntitySet(queryPathPart.path);
                    if (!currentEntitySet) {
                        currentEntitySet = this.metadata.getSingleton(queryPathPart.path);
                    }
                    previousEntitySet = currentEntitySet;
                    currentEntityType = currentEntitySet.entityType;
                } else {
                    const navPropDetail = currentEntityType.navigationProperties.find(
                        (navProp) => navProp.name === queryPathPart.path
                    );
                    if (navPropDetail) {
                        if (navPropDetail.name === 'SiblingEntity' && currentEntityType) {
                            asArray = asArray && navPropDetail.isCollection;
                            currentKeys = this.metadata.getKeys(innerData, currentEntityType);
                            currentKeys.IsActiveEntity = !innerData.IsActiveEntity;
                        } else {
                            visitedPaths.push(queryPathPart.path);
                            if (asArray) {
                                currentKeys = await this.getNavigationPropertyKeys(
                                    innerData,
                                    navPropDetail,
                                    currentEntityType,
                                    currentEntitySet,
                                    currentKeys,
                                    odataRequest.tenantId
                                );
                            }
                            const hasOnlyDraftKeyOrNoKeys =
                                Object.keys(currentKeys).length === 0 ||
                                (Object.keys(currentKeys).length === 1 && currentKeys.hasOwnProperty('IsActiveEntity'));
                            if (
                                navPropDetail.referentialConstraint.length == 0 &&
                                innerData.hasOwnProperty(queryPathPart.path) &&
                                (this.metadata.getVersion() === '2.0' || hasOnlyDraftKeyOrNoKeys)
                            ) {
                                // Fake containment for result set
                                targetContainedEntityType = navPropDetail.targetType;
                                targetContainedData = innerData[queryPathPart.path];
                                currentEntitySet = undefined;
                                currentEntityType = targetContainedEntityType;
                                if (hasOnlyDraftKeyOrNoKeys) {
                                    currentKeys = {};
                                }
                            } else if (!navPropDetail.containsTarget && previousEntitySet) {
                                currentEntitySet = previousEntitySet.navigationPropertyBinding[visitedPaths.join('/')];
                                previousEntitySet = currentEntitySet;
                                visitedPaths = [];
                                currentEntityType = currentEntitySet.entityType;
                                targetContainedEntityType = undefined;
                                targetContainedData = null;
                            } else {
                                targetContainedEntityType = navPropDetail.targetType;
                                targetContainedData = innerData[queryPathPart.path];
                                currentEntitySet = undefined;
                                currentEntityType = targetContainedEntityType;
                            }
                            asArray = asArray && navPropDetail.isCollection;
                        }
                    } else {
                        const propDetail = currentEntityType.entityProperties.find(
                            (navProp) => navProp.name === queryPathPart.path
                        );
                        if (propDetail) {
                            returnPropertyType = propDetail;
                            return innerData[queryPathPart.path];
                        }
                    }
                }
                if (
                    (!currentEntitySet &&
                        (!targetContainedEntityType || targetContainedEntityType.name === 'DraftAdministrativeData')) ||
                    (this.metadata.getVersion() === '2.0' && targetContainedData)
                ) {
                    if (Array.isArray(innerData)) {
                        return asArray ? [] : null;
                    } else {
                        return innerData[queryPathPart.path];
                    }
                }
                return (
                    await this.getMockEntitySet(
                        currentEntitySet?.name,
                        undefined,
                        targetContainedEntityType,
                        targetContainedData
                    )
                ).performGET(currentKeys, asArray, odataRequest.tenantId, odataRequest, dontClone);
            },
            Promise.resolve({})
        );
        if (returnPropertyType) {
            if (returnPropertyType?.targetType?._type === 'ComplexType') {
                const newData = cloneDeep(data);
                newData['@odata.context'] = this.metadata.getMetadataUrl() + '#' + returnPropertyType.type;
                return newData;
            } else {
                return {
                    '@odata.context': this.metadata.getMetadataUrl() + '#' + returnPropertyType.type,
                    value: data
                };
            }
        }
        if (
            rootEntitySet.entityType?.annotations?.Common?.ResultContext?.valueOf() &&
            odataRequest.queryPath.length === 1
        ) {
            // Parametrized entityset, they cannot be requested directly
            const potentialTarget = rootEntitySet.entityType.navigationProperties.find(
                (navProp) => navProp.containsTarget
            );
            throw new Error(
                JSON.stringify({
                    message:
                        'Parametrized entityset cannot be queried directly, you need to load the result set, most likely "' +
                        potentialTarget?.name +
                        '" in this case'
                })
            );
        }

        if (data !== null || (Array.isArray(data) && data.length > 0)) {
            // Apply $expand
            if (odataRequest.expandProperties) {
                await Promise.all(
                    Object.keys(odataRequest.expandProperties).map(async (expandNavProp) => {
                        return this.getExpandData(
                            currentEntitySet,
                            currentEntityType,
                            expandNavProp,
                            data,
                            odataRequest.expandProperties,
                            odataRequest.tenantId,
                            previousEntitySet,
                            visitedPaths,
                            odataRequest
                        );
                    })
                );
            }
            const mockEntitySet = await this.getMockEntitySet(
                currentEntitySet ? currentEntitySet.name : currentEntityType.name
            );

            // Apply $filter
            if (odataRequest.filterDefinition && Array.isArray(data)) {
                const filterDef = odataRequest.filterDefinition;

                data = data.filter((dataLine) => {
                    return mockEntitySet.checkFilter(dataLine, filterDef, odataRequest.tenantId, odataRequest);
                });
            }
            // Apply $search
            if (odataRequest.searchQuery && Array.isArray(data)) {
                const mockEntitySet = await this.getMockEntitySet(currentEntityType.name);
                data = data.filter((dataLine) => {
                    return mockEntitySet.checkSearch(dataLine, odataRequest.searchQuery, odataRequest);
                });
            }

            // Apply $apply for aggregates
            const applyDefinition = odataRequest.applyDefinition;
            if (applyDefinition) {
                const mockData = mockEntitySet.getMockData(odataRequest.tenantId);
                for (const applyTransformation of applyDefinition) {
                    data = await this.applyTransformation(
                        applyTransformation,
                        data,
                        odataRequest,
                        mockEntitySet,
                        mockData,
                        currentEntityType
                    );
                }
            }

            // Apply $orderby
            if (odataRequest.orderBy && odataRequest.orderBy.length > 0) {
                data = this._applyOrderBy(data, odataRequest.orderBy);
            }
            // Apply $select
            const originalData = data;
            data = cloneDeep(data);
            if (odataRequest.selectedProperties) {
                if (odataRequest.selectedProperties['DraftAdministrativeData']) {
                    if (Array.isArray(data)) {
                        data = data.map((element) => {
                            if (!element.DraftAdministrativeData) {
                                element.DraftAdministrativeData = null;
                            }
                            return element;
                        });
                    } else if (data != null && data.constructor.name === 'Object') {
                        if (!data.DraftAdministrativeData) {
                            data.DraftAdministrativeData = null;
                        }
                    }
                }
            }
            if (odataRequest.selectedProperties && Object.keys(odataRequest.selectedProperties).length > 0) {
                const select: Record<string, boolean> = {};
                Object.keys(odataRequest.selectedProperties).forEach((prop) => (select[prop] = true));
                const expand = {
                    expand: odataRequest.expandProperties ?? {},
                    properties: select
                };

                if (Array.isArray(data)) {
                    this.apply$Select(expand, data, currentEntityType);
                } else if (data != null && data.constructor.name === 'Object') {
                    this.apply$Select(expand, [data], currentEntityType);
                }
            }
            const dataLength = Array.isArray(data) ? data.length : 1;
            odataRequest.setDataCount(dataLength);

            // Apply $skip / $top
            if (Array.isArray(data) && odataRequest.startIndex !== undefined && odataRequest.maxElements) {
                data = data.slice(odataRequest.startIndex, odataRequest.startIndex + odataRequest.maxElements);
            }

            if (!this.isV4()) {
                const enrichElement = (
                    entitySet: EntitySet | Singleton | undefined,
                    entityType: EntityType | undefined,
                    dataLine: any,
                    originalDataLine: any
                ) => {
                    if (!entityType) {
                        return;
                    }
                    const keyValues: Record<string, string> = {};
                    entityType.keys.forEach((key) => {
                        keyValues[key.name] = dataLine[key.name] || originalDataLine[key.name];
                    });

                    if (entitySet) {
                        this.addV2Metadata(entitySet, keyValues, dataLine);
                    }

                    entityType.navigationProperties.forEach((navProp) => {
                        //eslint-disable-next-line
                        if (dataLine.hasOwnProperty(navProp.name)) {
                            if (entitySet?.navigationPropertyBinding[navProp.name]) {
                                if (navProp.isCollection) {
                                    let navPropData = dataLine[navProp.name];
                                    let hasResult = false;
                                    if (!Array.isArray(navPropData) && navPropData.hasOwnProperty('results')) {
                                        navPropData = navPropData.results;
                                        hasResult = true;
                                    }
                                    if (!Array.isArray(navPropData) && navPropData.hasOwnProperty('__deferred')) {
                                        navPropData = [];
                                        hasResult = false;
                                    }
                                    dataLine[navProp.name] = {
                                        results: navPropData.map((element: any, idx: number) => {
                                            let lineElementElement = originalDataLine[navProp.name][idx];
                                            if (hasResult) {
                                                lineElementElement = originalDataLine[navProp.name].results[idx];
                                            }
                                            return enrichElement(
                                                entitySet.navigationPropertyBinding[navProp.name],
                                                entityType.navigationProperties.find((nav) => nav.name === navProp.name)
                                                    ?.targetType,
                                                element,
                                                lineElementElement
                                            );
                                        })
                                    };
                                } else if (dataLine[navProp.name] !== null) {
                                    dataLine[navProp.name] = enrichElement(
                                        entitySet.navigationPropertyBinding[navProp.name],
                                        entityType.navigationProperties.find((nav) => nav.name === navProp.name)
                                            ?.targetType,
                                        dataLine[navProp.name],
                                        originalDataLine[navProp.name]
                                    );
                                }
                            }
                        }
                    });
                    return dataLine;
                };

                // Enrich data with __metadata for v2
                if (Array.isArray(data)) {
                    data = data.map((element, idx) => {
                        return enrichElement(currentEntitySet, currentEntityType, element, originalData[idx]);
                    });
                } else if (data != null) {
                    data = enrichElement(currentEntitySet, currentEntityType, data, originalData);
                }
            }

            if (isCount) {
                data = dataLength;
            }
        }

        return data;
    }

    public async updateData(odataRequest: ODataRequest, patchData: any) {
        const entitySetName = odataRequest.queryPath[0].path;
        if (odataRequest.queryPath.length > 1) {
            // In this case we are updating a property or a sub object so let's create the appropriate structure
            let updateObject: any = {};
            const finalPatchObject = updateObject;
            for (let i = 1; i < odataRequest.queryPath.length; i++) {
                updateObject[odataRequest.queryPath[i].path] = {};
                if (i === odataRequest.queryPath.length - 1) {
                    updateObject[odataRequest.queryPath[i].path] = patchData;
                }
                updateObject = updateObject[odataRequest.queryPath[i].path];
            }
            patchData = finalPatchObject;
        }
        return (await this.getMockEntitySet(entitySetName)).performPATCH(
            odataRequest.queryPath[0].keys,
            patchData,
            odataRequest.tenantId,
            odataRequest,
            true
        );
    }

    public async createData(odataRequest: ODataRequest, postData: any) {
        const entitySetName = odataRequest.queryPath[0].path;

        let parentEntitySet = this.metadata.getEntitySet(entitySetName);
        if (odataRequest.queryPath.length > 1 && parentEntitySet) {
            // Creating a sub object
            let lastNavPropName = '';
            for (let i = 0; i < odataRequest.queryPath.length; i++) {
                if (lastNavPropName && parentEntitySet.navigationPropertyBinding[lastNavPropName]) {
                    parentEntitySet = parentEntitySet.navigationPropertyBinding[lastNavPropName] as EntitySet;
                }
                lastNavPropName = odataRequest.queryPath[i].path;
            }
            const entityType = parentEntitySet.entityType;
            const navPropDetail = entityType.navigationProperties.find(
                (navProp) => navProp.name === lastNavPropName
            ) as any;
            const navPropEntityType = navPropDetail.targetType;
            const data: any = (await this.getMockEntitySet(parentEntitySet.name)).performGET(
                odataRequest.queryPath[odataRequest.queryPath.length - 2].keys,
                false,
                odataRequest.tenantId,
                odataRequest,
                true
            );

            const providedKeys: Record<string, any> = {};
            navPropEntityType.keys.forEach((key: Property) => {
                if (postData[key.name] !== undefined) {
                    providedKeys[key.name] = postData[key.name];
                }
            });
            const currentKeys = await this.getNavigationPropertyKeys(
                data,
                navPropDetail,
                parentEntitySet.entityType,
                parentEntitySet,
                providedKeys,
                odataRequest.tenantId,
                true
            );
            if (data.DraftAdministrativeData !== null && data.DraftAdministrativeData !== undefined) {
                data.DraftAdministrativeData.LastChangeDateTime = _getDateTimeOffset(this.isV4());
            }
            if (!navPropDetail.containsTarget) {
                const targetEntitySet = parentEntitySet.navigationPropertyBinding[lastNavPropName];
                odataRequest.setContext(`../$metadata#${targetEntitySet.name}/$entity`);
                odataRequest.addResponseHeader(
                    'Location',
                    `${targetEntitySet.name}(${Object.keys(currentKeys)
                        .map((key) => `${key}='${currentKeys[key]}'`)
                        .join(',')})`
                );
                postData = await (
                    await this.getMockEntitySet(targetEntitySet.name)
                ).performPOST(currentKeys, postData, odataRequest.tenantId, odataRequest, true);
                if (!this.isV4()) {
                    this.addV2Metadata(parentEntitySet, currentKeys, postData);
                }
            } else {
                if (!data[lastNavPropName]) {
                    data[lastNavPropName] = [];
                }
                data[lastNavPropName].push(postData);
            }
            return postData;
        } else if (parentEntitySet) {
            // Creating a main object
            const currentKeys: Record<string, any> = {};
            parentEntitySet.entityType.keys.forEach((key) => {
                if (postData[key.name] !== undefined) {
                    currentKeys[key.name] = postData[key.name];
                }
            });
            postData = await (
                await this.getMockEntitySet(parentEntitySet.name)
            ).performPOST(currentKeys, postData, odataRequest.tenantId, odataRequest, true);
            odataRequest.setContext(`../$metadata#${parentEntitySet.name}/$entity`);
            odataRequest.addResponseHeader(
                'Location',
                `${parentEntitySet.name}(${Object.keys(currentKeys)
                    .map((key) => `${key}='${currentKeys[key]}'`)
                    .join(',')})`
            );
            if (!this.isV4()) {
                this.addV2Metadata(parentEntitySet, currentKeys, postData);
            }
            odataRequest.setResponseData(await postData);
            return postData;
        } else {
            throw new Error('Unknown Entity Set' + entitySetName);
        }
    }

    private addV2Metadata(entitySet: EntitySet | Singleton, currentKeys: Record<string, string>, postData: any) {
        let keyStr = '';
        if (Object.keys(currentKeys).length === 1) {
            keyStr = currentKeys[Object.keys(currentKeys)[0]];
        } else {
            keyStr = Object.keys(currentKeys)
                .map((key) => `${key}='${currentKeys[key]}'`)
                .join(',');
        }
        const uri = `${this.service.urlPath}/${entitySet.name}(${keyStr})`;
        postData['__metadata'] = {
            id: uri,
            uri: uri,
            type: entitySet.entityTypeName
        };
    }

    public async deleteData(odataRequest: ODataRequest) {
        const entitySetName = odataRequest.queryPath[0].path;
        const mockEntitySet = await this.getMockEntitySet(entitySetName);
        return mockEntitySet.performDELETE(odataRequest.queryPath[0].keys, odataRequest.tenantId, odataRequest, true);
    }
    public async getDraftRoot(keyValues: KeyDefinitions, _tenantId: string, entitySetDefinition: EntitySet) {
        let data = {};
        try {
            const rootInfo = this.metadata.resolveDraftRoot(entitySetDefinition);
            let parentRequestPath = `${entitySetDefinition.name}(${Object.keys(keyValues)
                .map((keyName) => `${keyName}=${keyValues[keyName]}`)
                .join(',')})`;
            for (const element of rootInfo.path) {
                parentRequestPath += '/';
                parentRequestPath += element.partner?.name;
            }
            const parentRequest = new ODataRequest(
                {
                    url: '/' + parentRequestPath,
                    tenantId: _tenantId,
                    method: 'GET'
                },
                this
            );

            data = await this.getData(parentRequest, true);
        } catch (e) {
            console.log(e);
            console.log(
                "Couldn't find the parent for " + entitySetDefinition.name + ' ' + JSON.stringify(keyValues, null, 4)
            );
        }

        return data;
    }

    public resetStickySessionTimeout(odataRequest: ODataRequest, tenantId: string) {
        let UUID = '';
        let timeoutTime = 20;
        this.stickyEntitySets.forEach((entitySet) => {
            UUID = entitySet.resetSessionTimeout(tenantId);
            timeoutTime = entitySet.sessionTimeoutTime;
        });
        odataRequest.addResponseHeader('sap-contextid', UUID, true);
        odataRequest.addResponseHeader('sap-http-session-timeout', timeoutTime.toString(), true);
    }

    private _applyOrderBy(data: object[], orderByDefinition: OrderByProp[]): object[] {
        data.sort(function (firstElement: any, secondElement: any) {
            let isDecisive = false;
            let outValue = 0;
            orderByDefinition.forEach((orderByDef) => {
                if (isDecisive) {
                    return;
                }
                const firstElementData = getData(firstElement, orderByDef.name);
                const secondElementData = getData(secondElement, orderByDef.name);
                if (firstElementData > secondElementData) {
                    outValue = orderByDef.direction === 'asc' ? 1 : -1;
                    isDecisive = true;
                } else if (firstElementData < secondElementData) {
                    outValue = orderByDef.direction === 'asc' ? -1 : 1;
                    isDecisive = true;
                }
            });
            return outValue;
        });
        return data;
    }

    private async _applyGroupBy(
        data: object[],
        applyDefinition: GroupByTransformation,
        odataRequest: ODataRequest,
        mockData: FileBasedMockData
    ): Promise<object[]> {
        const dataByGroup: Record<string, any[]> = {};

        const getAggregateKey = function (dataLine: any) {
            return applyDefinition.groupBy.reduce((key, groupByProp) => {
                if (key.length > 0) {
                    key += ',';
                }
                key += dataLine[groupByProp];
                return key;
            }, '');
        };
        data.forEach((dataLine: any) => {
            const aggregateKey = getAggregateKey(dataLine);
            if (!dataByGroup[aggregateKey]) {
                dataByGroup[aggregateKey] = [];
            }
            dataByGroup[aggregateKey].push(dataLine);
        });

        data = Object.keys(dataByGroup).map((groupName) => {
            const dataToAggregate = dataByGroup[groupName];
            const outData: any = {};
            applyDefinition.groupBy.forEach((propName) => {
                outData[propName] = dataToAggregate[0][propName];
            });
            if (applyDefinition.subTransformations.length > 0) {
                const aggregateDefinition = applyDefinition.subTransformations[0] as AggregatesTransformation;
                aggregateDefinition.aggregateDef.forEach((subAggregateDefinition) => {
                    let propValue: any;
                    if (
                        subAggregateDefinition.operator === undefined &&
                        mockData &&
                        mockData.hasCustomAggregate(subAggregateDefinition.name, odataRequest)
                    ) {
                        propValue = mockData.performCustomAggregate(
                            subAggregateDefinition.name,
                            dataToAggregate,
                            odataRequest
                        );
                    } else {
                        dataToAggregate.forEach((dataLine) => {
                            const currentValue = dataLine[subAggregateDefinition.sourceProperty];
                            if (propValue === undefined) {
                                propValue = currentValue;
                            } else {
                                switch (subAggregateDefinition.operator) {
                                    case 'max':
                                        propValue = Math.max(propValue, currentValue);
                                        break;
                                    case 'min':
                                        propValue = Math.min(propValue, currentValue);
                                        break;
                                    case 'average':
                                        propValue += currentValue;
                                        break;
                                    default:
                                        propValue += currentValue;
                                        break;
                                }
                            }
                        });
                    }
                    if (subAggregateDefinition.operator === 'average') {
                        propValue = propValue / dataToAggregate.length;
                    }
                    outData[subAggregateDefinition.name] = propValue;
                });
            }
            return outData;
        });
        return data;
    }
    private async _applyFilter(
        data: object[],
        filterDefinition: FilterExpression,
        odataRequest: ODataRequest,
        mockEntitySet: EntitySetInterface
    ): Promise<object[]> {
        return data.filter((dataLine: object) => {
            return mockEntitySet.checkFilter(dataLine, filterDefinition, odataRequest.tenantId, odataRequest);
        });
    }
    private lastFilterTransformationResult: object[] = [];
    private async applyTransformation(
        transformationDef: TransformationDefinition,
        data: object[],
        odataRequest: ODataRequest,
        mockEntitySet: EntitySetInterface,
        mockData: FileBasedMockData,
        currentEntityType: EntityType
    ): Promise<object[]> {
        switch (transformationDef.type) {
            case 'orderBy':
                data = this._applyOrderBy(data, transformationDef.orderBy);
                break;
            case 'filter':
                data = await this._applyFilter(data, transformationDef.filterExpr, odataRequest, mockEntitySet);
                this.lastFilterTransformationResult = data;
                break;
            case 'aggregates':
                break;
            case 'ancestors':
                const limitedHierarchyForAncestors = await this.applyTransformation(
                    transformationDef.parameters.inputSetTransformations[0],
                    mockData.getAllEntries(odataRequest),
                    odataRequest,
                    mockEntitySet,
                    mockData,
                    currentEntityType
                );
                data = await mockData.getAncestors(
                    data,
                    this.lastFilterTransformationResult,
                    limitedHierarchyForAncestors,
                    currentEntityType,
                    transformationDef.parameters,
                    odataRequest
                );
                break;
            case 'skip':
                break;
            case 'search':
                data = data.filter((dataLine) => {
                    return mockEntitySet.checkSearch(dataLine, transformationDef.searchExpr, odataRequest);
                });
                this.lastFilterTransformationResult = data;
                break;
            case 'descendants':
                const limitedHierarchyData = await this.applyTransformation(
                    transformationDef.parameters.inputSetTransformations[0],
                    mockData.getAllEntries(odataRequest),
                    odataRequest,
                    mockEntitySet,
                    mockData,
                    currentEntityType
                );
                data = await mockData.getDescendants(
                    data,
                    this.lastFilterTransformationResult,
                    limitedHierarchyData,
                    currentEntityType,
                    transformationDef.parameters,
                    odataRequest
                );
                break;
            case 'groupBy':
                data = await this._applyGroupBy(data, transformationDef, odataRequest, mockData);
                break;
            case 'customFunction':
                if (transformationDef.name === 'com.sap.vocabularies.Hierarchy.v1.TopLevels') {
                    data = await mockData.getTopLevels(
                        data,
                        transformationDef.parameters as TopLevelParameters,
                        odataRequest
                    );
                }
                break;
        }
        return data;
    }
}
