import { isComplexTypeDefinition } from '@sap-ux/annotation-converter';
import type {
    Action,
    ComplexType,
    EntityType,
    NavigationProperty,
    Property,
    TypeDefinition
} from '@sap-ux/vocabularies-types';
import cloneDeep from 'lodash.clonedeep';
import type { EntitySetInterface, PartialReferentialConstraint } from '../data/common';
import { generateId, uuidv4 } from '../data/common';
import type { AncestorDescendantsParameters, TopLevelParameters } from '../request/applyParser';
import type ODataRequest from '../request/odataRequest';

export type KeyDefinitions = Record<string, number | boolean | string>;

function performSimpleComparison(operator: string, mockValue: any, targetLiteral: any) {
    let isValid = true;
    switch (operator) {
        case 'gt':
            isValid = mockValue > targetLiteral;
            break;
        case 'ge':
            isValid = mockValue >= targetLiteral;
            break;
        case 'lt':
            isValid = mockValue < targetLiteral;
            break;
        case 'le':
            isValid = mockValue <= targetLiteral;
            break;
        case 'ne':
            isValid = mockValue !== targetLiteral;
            break;
        case 'eq':
        default:
            isValid = mockValue === targetLiteral;
            break;
    }
    return isValid;
}
export class FileBasedMockData {
    protected _mockData: object[];
    protected _hierarchyTree: Record<string, Record<string, any>> = {};
    protected _entityType: EntityType;
    protected _mockDataEntitySet: EntitySetInterface;
    protected _contextId: string;
    constructor(mockData: any[], entityType: EntityType, mockDataEntitySet: EntitySetInterface, contextId: string) {
        this._entityType = entityType;
        this._contextId = contextId;

        this._mockDataEntitySet = mockDataEntitySet;
        if (mockData.length === 0 && (mockData as any).__generateMockData) {
            this._mockData = this.generateMockData();
        } else {
            this._mockData = cloneDeep(mockData);
            if (this._mockData.forEach) {
                this._mockData.forEach((mockLine: any) => {
                    // We need to ensure that complex types are at least partially created
                    this.validateProperties(mockLine, this._entityType.entityProperties);
                });
            }
        }
    }

    private validateProperties(mockEntry: any, properties: Property[]) {
        properties.forEach((prop) => {
            if (
                !prop.nullable &&
                !mockEntry.hasOwnProperty(prop.name) &&
                prop.annotations.Core?.Computed?.valueOf() !== true
            ) {
                mockEntry[prop.name] = this.getDefaultValueFromType(prop.type, prop.targetType, prop.defaultValue);
            } else if (mockEntry.hasOwnProperty(prop.name) && isComplexTypeDefinition(prop.targetType)) {
                // If the property is defined from a complex type we should validate the property of the complex type
                this.validateProperties(mockEntry[prop.name], prop.targetType.properties);
            }
        });
    }

    async addEntry(mockEntry: any, _odataRequest: ODataRequest): Promise<void> {
        this._mockData.push(mockEntry);
    }

    async updateEntry(
        keyValues: KeyDefinitions,
        updatedData: object,
        _patchData: object,
        _odataRequest: ODataRequest
    ): Promise<void> {
        const dataIndex = this.getDataIndex(keyValues, _odataRequest);
        this._mockData[dataIndex] = updatedData;
    }

    fetchEntries(keyValues: KeyDefinitions, _odataRequest: ODataRequest): object[] {
        const keys = this._entityType.keys;
        return this._mockData.filter((mockData) => {
            return Object.keys(keyValues).every(this.checkKeyValues(mockData, keyValues, keys, _odataRequest));
        });
    }

    hasEntry(keyValues: KeyDefinitions, _odataRequest: ODataRequest): boolean {
        return this.getDataIndex(keyValues, _odataRequest) !== -1;
    }

    hasEntries(_odataRequest: ODataRequest): boolean {
        return this._mockData.length > 0;
    }

    getAllEntries(_odataRequest: ODataRequest, dontClone: boolean = false): any[] {
        if (dontClone) {
            return this._mockData;
        }
        return cloneDeep(this._mockData);
    }

    protected getDataIndex(keyValues: KeyDefinitions, _odataRequest: ODataRequest): number {
        const keys = this._entityType.keys;
        return this._mockData.findIndex((mockData) => {
            return Object.keys(keyValues).every(this.checkKeyValues(mockData, keyValues, keys, _odataRequest));
        });
    }

    private checkKeyValues(mockData: object, keyValues: KeyDefinitions, keys: Property[], _odataRequest: ODataRequest) {
        return (keyName: string) => {
            return this._mockDataEntitySet.checkKeyValue(
                mockData,
                keyValues,
                keyName,
                keys.find((keyProp) => keyProp.name === keyName) as Property
            );
        };
    }

    async removeEntry(keyValues: KeyDefinitions, _odataRequest: ODataRequest): Promise<void> {
        const dataIndex = this.getDataIndex(keyValues, _odataRequest);
        if (dataIndex !== -1) {
            this._mockData.splice(dataIndex, 1);
        }
    }

    protected getDefaultValueFromType(
        type: string,
        complexType: ComplexType | TypeDefinition | undefined,
        defaultValue?: any
    ): any {
        if (complexType) {
            if (complexType._type === 'ComplexType') {
                const outData: any = {};
                complexType.properties.forEach((subProp) => {
                    outData[subProp.name] = this.getDefaultValueFromType(
                        subProp.type,
                        subProp.targetType,
                        subProp.defaultValue
                    );
                });
                return outData;
            } else if (complexType._type === 'TypeDefinition') {
                type = complexType.underlyingType;
            }
        }
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        switch (type) {
            case 'Edm.Int16':
            case 'Edm.Byte':
            case 'Edm.Int32':
            case 'Edm.Int64':
            case 'Edm.Decimal':
                return 0;
            case 'Edm.Boolean':
                return false;
            case 'Edm.DateTimeOffset': {
                const date = new Date();
                return this._mockDataEntitySet.isV4() ? date.toISOString() : '/Date(' + date.getTime() + '+0000)/';
            }
            case 'Edm.Date':
            case 'Edm.DateTime': {
                const date = new Date();
                const dateOut =
                    date.getUTCFullYear() +
                    '-' +
                    ('0' + (date.getUTCMonth() + 1)).slice(-2) +
                    '-' +
                    ('0' + date.getUTCDate()).slice(-2);
                return this._mockDataEntitySet.isV4() ? dateOut : '/Date(' + date.getTime() + '+0000)/';
            }
            case 'Edm.Time':
            case 'Time': {
                const date = new Date();
                // ODataModel expects ISO8601 duration format
                return 'PT' + date.getHours() + 'H' + date.getMinutes() + 'M' + date.getSeconds() + 'S';
            }
            default:
                return '';
        }
    }

    protected getRandomValueFromType(
        type: string,
        complexType: ComplexType | TypeDefinition | undefined,
        propertyName: string,
        lineIndex: number
    ): any {
        if (complexType) {
            const outData: any = {};
            if (complexType._type === 'ComplexType') {
                complexType.properties.forEach((subProp) => {
                    outData[subProp.name] = this.getRandomValueFromType(
                        subProp.type,
                        subProp.targetType,
                        subProp.name,
                        lineIndex
                    );
                });
                return outData;
            } else if (complexType._type === 'TypeDefinition') {
                type = complexType.underlyingType;
            }
        }
        switch (type) {
            case 'Edm.Int16':
            case 'Edm.Int32':
            case 'Edm.Int64':
                return Math.floor(Math.random() * 10000);
            case 'Edm.String':
                return `${propertyName}_${lineIndex}`;
            case 'Edm.Boolean':
                return Math.random() < 0.5;
            case 'Edm.Byte':
                return Math.floor(Math.random() * 10);
            case 'Edm.Decimal':
                return Math.floor(Math.random() * 100000) / 100;
            case 'Edm.Guid':
                return uuidv4();
            case 'Edm.Date':
            case 'Edm.DateTime':
            case 'Edm.DateTimeOffset': {
                const date = new Date();
                date.setFullYear(2000 + Math.floor(Math.random() * 22));
                date.setDate(Math.floor(Math.random() * 30));
                date.setMonth(Math.floor(Math.random() * 12));
                date.setMilliseconds(0);
                if (type === 'Edm.Date') {
                    const dateOut =
                        date.getUTCFullYear() +
                        '-' +
                        ('0' + (date.getUTCMonth() + 1)).slice(-2) +
                        '-' +
                        ('0' + date.getUTCDate()).slice(-2);
                    return this._mockDataEntitySet.isV4() ? dateOut : '/Date(' + date.getTime() + '+0000)/';
                } else {
                    return this._mockDataEntitySet.isV4() ? date.toISOString() : '/Date(' + date.getTime() + '+0000)/';
                }
            }
            case 'Edm.Time':
            case 'Time':
                // ODataModel expects ISO8601 duration format
                return (
                    'PT' +
                    Math.floor(Math.random() * 23) +
                    'H' +
                    Math.floor(Math.random() * 59) +
                    'M' +
                    Math.floor(Math.random() * 59) +
                    'S'
                );
            case 'Edm.TimeOfDay':
            case 'Edm.Binary':
            default:
                return '';
        }
    }

    getEmptyObject(_odataRequest: ODataRequest): object {
        const outObj: any = {};
        this._entityType.entityProperties.forEach((property) => {
            outObj[property.name] = this.getDefaultValueFromType(
                property.type,
                property.targetType,
                property.defaultValue
            );
        });

        return outObj;
    }

    getDefaultElement(_odataRequest: ODataRequest): object {
        if (this._mockData && !Array.isArray(this._mockData)) {
            return this._mockData;
        } else if (this._mockData.length >= 1) {
            return cloneDeep(this._mockData[0]);
        } else {
            return this.getEmptyObject(_odataRequest);
        }
    }

    generateKey(property: Property, lineIndex?: number, mockData: any = []) {
        const currentMockData = this._mockData || mockData;
        let highestIndex: number;
        switch (property.type) {
            case 'Edm.Int32':
                highestIndex = 0;
                currentMockData.forEach((mockLine: any) => {
                    const mockLineIndex = parseInt(mockLine[property.name], 10);
                    highestIndex = Math.max(highestIndex, mockLineIndex);
                });
                return highestIndex + 1;
            case 'Edm.Boolean':
                return Math.random() > 0.5;
            case 'Edm.Guid':
                return uuidv4();
            case 'Edm.String':
                if (lineIndex === undefined) {
                    lineIndex = currentMockData.length + 1;
                }
                return `${property.name}_${lineIndex}`;
            default:
                return generateId(12);
        }
    }

    generateMockDataLine(iIndex: number, mockData: any) {
        const outObj: any = {};
        this._entityType.entityProperties.forEach((property) => {
            if (property.isKey) {
                outObj[property.name] = this.generateKey(property, iIndex, mockData);
            } else {
                outObj[property.name] = this.getRandomValueFromType(
                    property.type,
                    property.targetType,
                    property.name,
                    iIndex
                );
            }
        });
        this._entityType.navigationProperties.forEach((navigationProperty) => {
            if (navigationProperty.containsTarget) {
                outObj[navigationProperty.name] = [];
            }
        });

        return outObj;
    }

    getParentEntityInterface(): Promise<FileBasedMockData | undefined> {
        return this._mockDataEntitySet.getParentEntityInterface(this._contextId);
    }

    getEntityInterface(entitySetName: string): Promise<FileBasedMockData | undefined> {
        return this._mockDataEntitySet.getEntityInterface(entitySetName, this._contextId);
    }

    generateMockData() {
        const mockData: any[] = [];
        for (let i = 0; i < 150; i++) {
            mockData.push(this.generateMockDataLine(i, mockData));
        }
        return mockData;
    }

    /**
     * Allow to modify the action data beforehand.
     *
     * @param _actionDefinition
     * @param actionData
     * @param _keys
     * @param _odataRequest
     */
    async onBeforeAction(
        _actionDefinition: Action,
        actionData: any,
        _keys: Record<string, any>,
        _odataRequest: ODataRequest
    ): Promise<object> {
        return actionData;
    }
    /**
     * Do something with the action.
     *
     * @param _actionDefinition
     * @param actionData
     * @param _keys
     * @param _odataRequest
     */
    async executeAction(
        _actionDefinition: Action,
        actionData: any,
        _keys: Record<string, any>,
        _odataRequest: ODataRequest
    ): Promise<object | undefined> {
        return actionData;
    }

    /**
     * Allow to modify the response data.
     *
     * @param _actionDefinition
     * @param _actionData
     * @param _keys
     * @param responseData
     * @param _odataRequest
     */
    async onAfterAction(
        _actionDefinition: Action,
        _actionData: any,
        _keys: Record<string, any>,
        responseData: any,
        _odataRequest: ODataRequest
    ): Promise<any> {
        return responseData;
    }

    //eslint-disable-next-line
    async onAfterUpdateEntry(
        _keyValues: KeyDefinitions,
        _updatedData: object,
        _odataRequest: ODataRequest
    ): Promise<void> {
        // DO Nothing
    }
    //eslint-disable-next-line
    async onBeforeUpdateEntry(
        _keyValues: KeyDefinitions,
        _updatedData: object,
        _odataRequest: ODataRequest
    ): Promise<void> {
        // DO Nothing
    }
    //eslint-disable-next-line
    hasCustomAggregate(_customAggregateName: string, _odataRequest: ODataRequest): boolean {
        return false;
    }
    //eslint-disable-next-line
    performCustomAggregate(_customAggregateName: string, _dataToAggregate: any[], _odataRequest: ODataRequest): any {
        // DO Nothing
    }
    checkSearchQuery(mockValue: any, searchQuery: string, _odataRequest: ODataRequest) {
        return mockValue?.toString().includes(searchQuery);
    }

    checkFilterValue(
        comparisonType: string,
        mockValue: any,
        literal: any,
        operator: string,
        _odataRequest: ODataRequest
    ) {
        let isValid = true;
        switch (comparisonType) {
            case 'Edm.Boolean':
                isValid = !!mockValue === (literal === 'true');
                break;

            case 'Edm.Byte':
            case 'Edm.Int16':
            case 'Edm.Int32':
            case 'Edm.Int64': {
                const intTestValue = parseInt(literal, 10);
                isValid = performSimpleComparison(operator, mockValue, intTestValue);
                break;
            }
            case 'Edm.Decimal': {
                const decimalTestValue = parseFloat(literal);
                isValid = performSimpleComparison(operator, mockValue, decimalTestValue);
                break;
            }
            case 'Edm.Date':
            case 'Edm.Time':
            case 'Edm.DateTime':
            case 'Edm.DateTimeOffset':
                let targetDateLiteral = literal;
                if (literal && literal.startsWith("datetime'")) {
                    targetDateLiteral = literal.substring(9, literal.length - 1);
                }
                const testValue = new Date(targetDateLiteral).getTime();
                const mockValueDate = new Date(mockValue).getTime();
                isValid = performSimpleComparison(operator, mockValueDate, testValue);
                break;
            case 'Edm.String':
            case 'Edm.Guid':
            default:
                let targetLiteral = literal;
                if (literal && literal.startsWith("guid'")) {
                    targetLiteral = literal.substring(5, literal.length - 1);
                } else if (literal && literal.startsWith("'")) {
                    targetLiteral = literal.substring(1, literal.length - 1);
                }

                isValid = performSimpleComparison(operator, mockValue?.toString(), targetLiteral);
                break;
        }
        return isValid;
    }

    async getReferentialConstraints(
        _navigationProperty: NavigationProperty
    ): Promise<PartialReferentialConstraint[] | undefined> {
        return undefined;
    }
    buildTree(
        hierarchyNode: any,
        allItems: Record<string, any[]>,
        idNode: string,
        parentIdentifier: string,
        depth: number = 0,
        parentNode: any
    ): any {
        const id = hierarchyNode[idNode];
        const children = allItems[id];
        const resultingChildren: any[] = [];
        if (children) {
            for (const child of children) {
                //if (child.$inResultSet === true || child.$inResultSet === undefined) {
                resultingChildren.push(
                    this.buildTree(child, allItems, idNode, parentIdentifier, depth + 1, hierarchyNode)
                );
                //}
            }
        }
        hierarchyNode.$parent = parentNode;
        hierarchyNode.$children = resultingChildren;
        hierarchyNode.$rootDistance = depth;
        return hierarchyNode;
    }
    buildHierarchyTree(hierarchyQualifier: string, inputSet: any[]) {
        //if (!this._hierarchyTree[hierarchyQualifier]) {
        const itemPerParents: Record<string, any[]> = {};
        const aggregationAnnotation =
            this._entityType.annotations?.Aggregation?.[`RecursiveHierarchy#${hierarchyQualifier}`];
        const sourceReference =
            aggregationAnnotation!.ParentNavigationProperty.$target.referentialConstraint[0].sourceProperty;

        inputSet.forEach((item: any) => {
            if (!itemPerParents[item[sourceReference]]) {
                itemPerParents[item[sourceReference]] = [];
            }
            itemPerParents[item[sourceReference]].push(item);
        });
        this._hierarchyTree[hierarchyQualifier] = itemPerParents;

        return this._hierarchyTree[hierarchyQualifier];
    }
    flattenTree(
        currentNode: any,
        outItems: any[],
        nodeProperty: string,
        distanceFromRootProperty: string | undefined,
        limitedDescendantCount: string | undefined,
        matchedDescendantCountProperty: string | undefined,
        drillStateProperty: string | undefined,
        depth: number,
        toExpand: string[] = [],
        toCollapse: string[] = [],
        toShow: string[] = [],
        toShowAncestors: string[] = [],
        forceExpand: boolean = false
    ) {
        let descendantCount = 0;
        const shouldShowAncestor = toShowAncestors.includes(currentNode[nodeProperty]);
        if (currentNode && (depth < 0 || depth > 0 || forceExpand || shouldShowAncestor)) {
            const shouldExpand = toExpand.includes(currentNode[nodeProperty]);
            if (shouldExpand) {
                depth++;
            }

            const shouldShow = toShow.includes(currentNode[nodeProperty]);
            if (shouldShowAncestor && !shouldExpand) {
                forceExpand = true;
            }
            if (shouldShow && !shouldShowAncestor) {
                depth = 1;
            }
            const shouldCollapse = toCollapse.includes(currentNode[nodeProperty]);
            if (shouldCollapse) {
                depth = 1;
            }
            const isLastLevel = depth === 1;
            const isPastLastLevel = depth === 0;
            let wasAdded = false;
            if (
                !outItems.includes(currentNode) &&
                (!isPastLastLevel || !forceExpand || shouldShow || shouldShowAncestor)
            ) {
                wasAdded = true;
                outItems.push(currentNode);
            }

            if (distanceFromRootProperty) {
                currentNode[distanceFromRootProperty] = currentNode.$rootDistance;
            }

            if (drillStateProperty) {
                if (isLastLevel && currentNode.$children?.length === 0) {
                    currentNode[drillStateProperty] = 'leaf';
                } else if (isLastLevel && !shouldShowAncestor) {
                    currentNode[drillStateProperty] = 'collapsed';
                } else {
                    currentNode[drillStateProperty] = 'expanded';
                }
            }
            const children = currentNode.$children ?? [];
            children.forEach((child: any) => {
                descendantCount += this.flattenTree(
                    child,
                    outItems,
                    nodeProperty,
                    distanceFromRootProperty,
                    limitedDescendantCount,
                    matchedDescendantCountProperty,
                    drillStateProperty,
                    depth - 1,
                    toExpand,
                    toCollapse,
                    toShow,
                    toShowAncestors,
                    forceExpand
                );
            });
            if (limitedDescendantCount) {
                currentNode[limitedDescendantCount] = isLastLevel && !shouldShowAncestor ? 0 : descendantCount;
            }

            if (currentNode.$inResultSet && wasAdded) {
                descendantCount++;
            }
            return descendantCount;
        }
        return descendantCount;
    }

    getAncestorsOfNode(
        currentNode: any,
        outItems: any[],
        nodeProperty: string,
        distanceFromRootProperty: string | undefined,
        matchedDescendantsProperty: string | undefined,
        matchedProperty: string | undefined,
        drillStateProperty: string | undefined,
        depth: number,
        matchedChildrenCount: number,
        matchedProperties: any[]
    ) {
        let descendantCount = 0;
        if (currentNode && (depth < 0 || depth > 0)) {
            const isLastLevel = depth === 1;
            if (outItems.includes(currentNode)) {
                if (matchedDescendantsProperty) {
                    currentNode[matchedDescendantsProperty] += matchedChildrenCount;
                }
            } else {
                outItems.push(currentNode);

                if (matchedDescendantsProperty) {
                    currentNode[matchedDescendantsProperty] = matchedChildrenCount;
                }
                if (matchedProperty) {
                    currentNode[matchedProperty] = !!matchedProperties.find(
                        (prop) => prop[nodeProperty] === currentNode[nodeProperty]
                    );
                    if (currentNode[matchedProperty]) {
                        matchedChildrenCount++;
                    }
                }
                if (distanceFromRootProperty) {
                    currentNode[distanceFromRootProperty] = currentNode.$rootDistance;
                }

                if (drillStateProperty) {
                    const includedChildrenCount =
                        currentNode.$children?.filter((child: any) => child.$inResultSet).length ?? 0;
                    if (isLastLevel && includedChildrenCount === 0) {
                        currentNode[drillStateProperty] = 'leaf';
                    } else if (isLastLevel) {
                        currentNode[drillStateProperty] = 'collapsed';
                    } else {
                        currentNode[drillStateProperty] = 'expanded';
                    }
                }
            }
            if (currentNode.$parent) {
                this.getAncestorsOfNode(
                    currentNode.$parent,
                    outItems,
                    nodeProperty,
                    distanceFromRootProperty,
                    matchedDescendantsProperty,
                    matchedProperty,
                    drillStateProperty,
                    depth - 1,
                    matchedChildrenCount,
                    matchedProperties
                );
            }

            descendantCount++; // also include yourself
            return descendantCount;
        }
        return descendantCount;
    }

    async getTopLevels(data: any[], _parameters: TopLevelParameters, _odataRequest: ODataRequest) {
        const hierarchyQualifier = _parameters.HierarchyQualifier.substring(
            1,
            _parameters.HierarchyQualifier.length - 1
        );

        const outItems: any[] = [];
        const aggregationAnnotation =
            this._entityType.annotations?.Aggregation?.[`RecursiveHierarchy#${hierarchyQualifier}`];
        if (aggregationAnnotation) {
            const nodeProperty = aggregationAnnotation.NodeProperty.$target.name;

            const adjustedData = this._mockData.map((item: any) => {
                const adjustedRowData = data.find((dataItem: any) => dataItem[nodeProperty] === item[nodeProperty]);
                if (adjustedRowData) {
                    return { ...item, ...adjustedRowData, ...{ $inResultSet: true } };
                } else {
                    return { ...item, ...{ $inResultSet: false } };
                }
            });
            const hierarchyNodes = this.buildHierarchyTree(hierarchyQualifier, adjustedData);
            const sourceReference =
                aggregationAnnotation.ParentNavigationProperty.$target.referentialConstraint[0].sourceProperty;
            // TODO Considering the input set the top level node is not necessarely the root node
            const allRootNodes = adjustedData.filter((node) => {
                const parent = adjustedData.find((parent) => parent[nodeProperty] === node[sourceReference]);
                return !parent || !parent.$inResultSet;
            });

            const depth: number = parseInt(_parameters.Levels, 10);

            const hierarchyAnnotation = this._entityType.annotations?.Hierarchy?.[
                `RecursiveHierarchy#${hierarchyQualifier}`
            ] as any;
            let distanceFromRootProperty: string | undefined;
            let matchedDescendantCountProperty: string | undefined;
            let limitedDescendantCountProperty: string | undefined;
            let drillStateProperty: string | undefined;
            if (hierarchyAnnotation) {
                distanceFromRootProperty = hierarchyAnnotation.DistanceFromRootProperty?.$target.name;
                limitedDescendantCountProperty = hierarchyAnnotation.LimitedDescendantCountProperty?.$target.name;
                matchedDescendantCountProperty = hierarchyAnnotation.MatchedDescendantCountProperty?.$target.name;
                drillStateProperty = hierarchyAnnotation.DrillStateProperty?.$target.name;
            }

            const toExpand = _parameters.Expand?.map((expand) => expand.substring(1, expand.length - 1)) ?? [];
            const toShow = _parameters.Show?.map((collapse) => collapse.substring(1, collapse.length - 1)) ?? [];
            const toShowAncestors: string[] = [];
            for (const nodeId of toShow) {
                const node = this._mockData.find((node: any) => node[nodeProperty] === nodeId);
                if (node) {
                    const toShowAncestorsDef = await this.getAncestors(
                        this._mockData,
                        this._mockData,
                        [node],
                        this._entityType,
                        {
                            hierarchyRoot: '',
                            qualifier: hierarchyQualifier,
                            propertyPath: '',
                            maximumDistance: -1,
                            keepStart: false,
                            inputSetTransformations: []
                        },
                        _odataRequest
                    );
                    toShowAncestorsDef.forEach((ancestor: any) => {
                        toShowAncestors.push(ancestor[nodeProperty]);
                    });
                }
            }
            allRootNodes.forEach((rootNode) => {
                const hierarchy = this.buildTree(rootNode, hierarchyNodes, nodeProperty, sourceReference, 0, undefined);
                this.flattenTree(
                    hierarchy,
                    outItems,
                    nodeProperty,
                    distanceFromRootProperty,
                    limitedDescendantCountProperty,
                    matchedDescendantCountProperty,
                    drillStateProperty,
                    depth,
                    toExpand,
                    _parameters.Collapse?.map((collapse) => collapse.substring(1, collapse.length - 1)),
                    toShow,
                    toShowAncestors
                );
            });

            let outData: object[] = [];
            outItems.forEach((item: any) => {
                const subTreeData = data.find((dataItem: any) => dataItem[nodeProperty] === item[nodeProperty]);
                if (subTreeData) {
                    if (
                        matchedDescendantCountProperty &&
                        drillStateProperty &&
                        item[matchedDescendantCountProperty] === 0
                    ) {
                        item[drillStateProperty] = 'leaf';
                    }
                    outData.push({ ...subTreeData, ...item });
                } else if (toShow.includes(item[nodeProperty]) || toShowAncestors.includes(item[nodeProperty])) {
                    outData.push(item);
                }
            });
            // restrict tree data with skiplocation && skipcontext
            if (_odataRequest.skipLocation) {
                let skipLocation = _odataRequest.skipLocation.split('(')[1].split(')')[0];
                skipLocation = skipLocation.substring(1, skipLocation.length - 1);
                const skipLocationIndex = outData.findIndex((item: any) => item[nodeProperty] === skipLocation);
                if (skipLocationIndex >= _odataRequest.skipContext) {
                    outData = outData.slice(skipLocationIndex - _odataRequest.skipContext);
                    _odataRequest.addResponseAnnotation(
                        '@com.sap.vocabularies.Common.v1.skip',
                        skipLocationIndex - _odataRequest.skipContext
                    );
                }
            }

            return outData;
        }
        return outItems;
    }

    async getDescendants(
        inputSet: object[],
        lastFilterTransformationResult: object[],
        hierarchyFilter: object[],
        entityType: EntityType,
        _parameters: AncestorDescendantsParameters,
        _odataRequest: ODataRequest
    ): Promise<object[]> {
        const aggregationAnnotation =
            this._entityType.annotations?.Aggregation?.[`RecursiveHierarchy#${_parameters.qualifier}`];
        const hierarchyAnnotation = this._entityType.annotations?.Hierarchy?.[
            `RecursiveHierarchy#${_parameters.qualifier}`
        ] as any;
        let distanceFromRootProperty: string | undefined;
        let limitedDescendantCountProperty: string | undefined;
        let matchedDescendantCountProperty: string | undefined;
        let drillStateProperty: string | undefined;
        let matchedProperty: string | undefined;
        if (hierarchyAnnotation) {
            distanceFromRootProperty = hierarchyAnnotation.DistanceFromRootProperty?.$target.name;
            limitedDescendantCountProperty = hierarchyAnnotation.LimitedDescendantCountProperty?.$target.name;
            matchedDescendantCountProperty = hierarchyAnnotation.MatchedDescendantCountProperty?.$target.name;
            drillStateProperty = hierarchyAnnotation.DrillStateProperty?.$target.name;
            matchedProperty = hierarchyAnnotation.MatchedProperty?.$target.name;
        }

        if (aggregationAnnotation) {
            const nodeProperty = aggregationAnnotation.NodeProperty.$target.name;
            const adjustedData = this._mockData.map((item: any) => {
                const adjustedRowData = hierarchyFilter.find(
                    (dataItem: any) => dataItem[nodeProperty] === item[nodeProperty]
                );
                if (adjustedRowData) {
                    return { ...item, ...adjustedRowData, ...{ $inResultSet: true } };
                } else {
                    return { ...item, ...{ $inResultSet: false } };
                }
            });
            const hierarchyNodes = this.buildHierarchyTree(_parameters.qualifier, adjustedData);
            const sourceReference =
                aggregationAnnotation.ParentNavigationProperty.$target.referentialConstraint[0].sourceProperty;
            const rootNodes = hierarchyNodes[''];
            rootNodes.forEach((rootNode: any) => {
                this.buildTree(rootNode, hierarchyNodes, nodeProperty, sourceReference, 0, undefined);
            });

            const subTrees: object[] = [];
            hierarchyFilter.forEach((item: any) => {
                const parentNodeChildren = hierarchyNodes[item[sourceReference]];
                const currentNode = parentNodeChildren.find((node: any) => node[nodeProperty] === item[nodeProperty]);
                if (_parameters.keepStart) {
                    if (matchedProperty) {
                        // TODO compare with lastFilterTransformationResult
                        currentNode[matchedProperty] = true;
                    }
                    subTrees.push(currentNode);
                }
                currentNode.$children.forEach((child: any) => {
                    this.flattenTree(
                        child,
                        subTrees,
                        nodeProperty,
                        distanceFromRootProperty,
                        limitedDescendantCountProperty,
                        matchedDescendantCountProperty,
                        drillStateProperty,
                        _parameters.maximumDistance
                    );
                });
            });
            const outData: object[] = [];
            inputSet.forEach((item: any) => {
                const subTreeData: any = subTrees.find(
                    (dataItem: any) => dataItem[nodeProperty] === item[nodeProperty]
                );
                if (subTreeData) {
                    if (
                        matchedDescendantCountProperty &&
                        drillStateProperty &&
                        item[matchedDescendantCountProperty] === 0
                    ) {
                        subTreeData[drillStateProperty] = 'leaf';
                    }
                    outData.push({ ...item, ...subTreeData });
                }
            });
            return outData;
        } else {
            return [];
        }
    }

    async getAncestors(
        inputSet: object[],
        lastFilterTransformationResult: object[],
        limitedHierarchy: object[],
        entityType: EntityType,
        _parameters: AncestorDescendantsParameters,
        _odataRequest: ODataRequest
    ): Promise<object[]> {
        const aggregationAnnotation =
            this._entityType.annotations?.Aggregation?.[`RecursiveHierarchy#${_parameters.qualifier}`];
        const hierarchyAnnotation = this._entityType.annotations?.Hierarchy?.[
            `RecursiveHierarchy#${_parameters.qualifier}`
        ] as any;
        let distanceFromRootProperty: string | undefined;
        let matchedDescendantCountProperty: string | undefined;
        let matchedProperty: string | undefined;
        let drillStateProperty: string | undefined;
        if (hierarchyAnnotation) {
            distanceFromRootProperty = hierarchyAnnotation.DistanceFromRootProperty?.$target.name;
            drillStateProperty = hierarchyAnnotation.DrillStateProperty?.$target.name;
            matchedDescendantCountProperty = hierarchyAnnotation.MatchedDescendantCountProperty?.$target.name;
            matchedProperty = hierarchyAnnotation.MatchedProperty?.$target.name;
        }

        if (aggregationAnnotation) {
            const nodeProperty = aggregationAnnotation.NodeProperty.$target.name;
            const sourceReference =
                aggregationAnnotation.ParentNavigationProperty.$target.referentialConstraint[0].sourceProperty;
            const adjustedData = this._mockData.map((item: any) => {
                const adjustedRowData = limitedHierarchy.find(
                    (dataItem: any) => dataItem[nodeProperty] === item[nodeProperty]
                );
                if (adjustedRowData) {
                    return { ...item, ...adjustedRowData, ...{ $inResultSet: true } };
                } else {
                    return { ...item, ...{ $inResultSet: false } };
                }
            });
            const hierarchyNodes = this.buildHierarchyTree(_parameters.qualifier, adjustedData);
            const rootNodes = hierarchyNodes[''];
            rootNodes.forEach((rootNode: any) => {
                this.buildTree(rootNode, hierarchyNodes, nodeProperty, sourceReference, 0, undefined);
            });
            const ancestors: any[] = [];
            limitedHierarchy.forEach((item: any) => {
                const parentNodeChildren = hierarchyNodes[item[sourceReference]];
                const currentNode = parentNodeChildren.find((node: any) => node[nodeProperty] === item[nodeProperty]);
                if (_parameters.keepStart) {
                    this.getAncestorsOfNode(
                        currentNode,
                        ancestors,
                        nodeProperty,
                        distanceFromRootProperty,
                        matchedDescendantCountProperty,
                        matchedProperty,
                        drillStateProperty,
                        _parameters.maximumDistance - 1,
                        0,
                        lastFilterTransformationResult
                    );
                } else if (currentNode && currentNode.$parent) {
                    this.getAncestorsOfNode(
                        currentNode.$parent,
                        ancestors,
                        nodeProperty,
                        distanceFromRootProperty,
                        matchedDescendantCountProperty,
                        matchedProperty,
                        drillStateProperty,
                        _parameters.maximumDistance - 1,
                        1,
                        lastFilterTransformationResult
                    );
                }
            });
            const outData: object[] = [];
            inputSet.forEach((item: any) => {
                const subTreeData = ancestors.find((dataItem: any) => dataItem[nodeProperty] === item[nodeProperty]);
                if (subTreeData) {
                    outData.push({ ...item, ...subTreeData });
                }
            });
            return outData;
        } else {
            return [];
        }
    }
}
