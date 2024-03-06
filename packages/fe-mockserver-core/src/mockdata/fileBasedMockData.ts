import { isComplexTypeDefinition } from '@sap-ux/annotation-converter';
import type {
    Action,
    ComplexType,
    EntityType,
    NavigationProperty,
    Property,
    PropertyPath,
    TypeDefinition
} from '@sap-ux/vocabularies-types';
import type { PathAnnotationExpression } from '@sap-ux/vocabularies-types/Edm';
import type { RecursiveHierarchy } from '@sap-ux/vocabularies-types/vocabularies/Aggregation';
import cloneDeep from 'lodash.clonedeep';
import type { EntitySetInterface, PartialReferentialConstraint } from '../data/common';
import { generateId, getData, setData, uuidv4 } from '../data/common';
import type { AncestorDescendantsParameters, TopLevelParameters } from '../request/applyParser';
import type ODataRequest from '../request/odataRequest';
import type { KeyDefinitions } from '../request/odataRequest';

type HierarchyDefinition = {
    distanceFromRootProperty: string | undefined;
    drillStateProperty: string | undefined;
    matchedDescendantCountProperty: string | undefined;
    matchedProperty: string | undefined;
    limitedDescendantCountProperty: string | undefined;
    sourceReference: string;
};

type ToExpand = {
    name: string;
    depth: number;
};

function getNumberLength(number: number): number {
    return number.toString().length;
}
export function isPropertyPathExpression(expression: unknown): expression is PropertyPath {
    return (expression as PropertyPath)?.type === 'PropertyPath';
}
export function isPathExpression(expression: unknown): expression is PathAnnotationExpression<Property> {
    return (expression as PathAnnotationExpression<Property>)?.type === 'Path';
}

export function getPathOrPropertyPath(expression: unknown) {
    if (isPropertyPathExpression(expression)) {
        return expression.value;
    } else if (isPathExpression(expression)) {
        return expression.path;
    }
}

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
        case 'in':
            isValid = targetLiteral.includes(mockValue);
            break;
        case 'eq':
        default:
            isValid = mockValue === targetLiteral;
            break;
    }
    return isValid;
}

function getNodeProperty(aggregationAnnotation: RecursiveHierarchy) {
    const nodeProperty = aggregationAnnotation.NodeProperty;
    if (!nodeProperty.$target) {
        throw new Error(`Unknown NodeProperty: '${nodeProperty.value}'`);
    }
    return getPathOrPropertyPath(nodeProperty);
}

function deleteData(currentNode: any, deepProperty: string) {
    const deepPropertyPath = deepProperty.split('/');
    let subNode = currentNode;
    for (const deepPropertyPart of deepPropertyPath.slice(0, deepPropertyPath.length - 1)) {
        subNode = currentNode[deepPropertyPart];
    }
    delete subNode[deepPropertyPath[deepPropertyPath.length - 1]];
}

function compareRowData(
    row1: any,
    row2: any,
    hierarchyNodeProperty: string,
    hierarchySourceProperty: string,
    isDraft: boolean
): boolean {
    if (isDraft) {
        if (hierarchyNodeProperty === hierarchySourceProperty) {
            return (
                getData(row1, hierarchyNodeProperty) === getData(row2, hierarchySourceProperty) &&
                getData(row1, 'IsActiveEntity') === getData(row2, 'IsActiveEntity')
            );
        } else {
            return (
                getData(row1, hierarchyNodeProperty) === getData(row2, hierarchySourceProperty) &&
                getData(row1, 'IsActiveEntity') === true
            );
        }
    }
    return getData(row1, hierarchyNodeProperty) === getData(row2, hierarchySourceProperty);
}
export class FileBasedMockData {
    protected _mockData: object[];
    protected _hierarchyTree: Record<string, Record<string, any>> = {};
    protected _entityType: EntityType;
    protected _mockDataEntitySet: EntitySetInterface;
    protected _contextId: string;
    protected __generateMockData: boolean;
    protected __forceNullableValuesToNull: boolean;
    constructor(mockData: any[], entityType: EntityType, mockDataEntitySet: EntitySetInterface, contextId: string) {
        this._entityType = entityType;
        this._contextId = contextId;

        this._mockDataEntitySet = mockDataEntitySet;
        if ((mockData as any)?.__forceNullableValuesToNull) {
            this.__forceNullableValuesToNull = true;
        }
        if (mockData.length === 0 && (mockData as any).__generateMockData) {
            this.__generateMockData = true;
            this._mockData = this.generateMockData();
        } else {
            this._mockData = cloneDeep(mockData);
            if (this._mockData.forEach) {
                this._mockData.forEach((mockLine: any) => {
                    // We need to ensure that complex types are at least partially created
                    this.validateProperties(mockLine, this._entityType.entityProperties);
                });
            }
            this.cleanupHierarchies();
        }
    }

    private validateProperties(mockEntry: any, properties: Property[]) {
        properties.forEach((prop) => {
            if (prop.nullable === false && !mockEntry.hasOwnProperty(prop.name)) {
                mockEntry[prop.name] = this.getDefaultValueFromType(
                    prop,
                    prop.type,
                    prop.targetType,
                    prop.defaultValue
                );
            } else if (mockEntry.hasOwnProperty(prop.name) && isComplexTypeDefinition(prop.targetType)) {
                // If the property is defined from a complex type we should validate the property of the complex type
                this.validateProperties(mockEntry[prop.name], prop.targetType.properties);
            }
        });
    }
    public cleanupHierarchies() {
        const allAggregations = this._entityType.annotations?.Aggregation ?? {};
        const hierarchies = Object.keys(allAggregations).filter((aggregationName) =>
            aggregationName.startsWith('RecursiveHierarchy')
        );
        for (const aggregationName of hierarchies) {
            const aggregationDefinition: RecursiveHierarchy = allAggregations[
                aggregationName as keyof typeof allAggregations
            ] as RecursiveHierarchy;
            const hierarchyDefinition = this.getHierarchyDefinition(aggregationDefinition.qualifier, true);
            if (this._mockData.forEach) {
                this._mockData.forEach((mockLine) => {
                    this.cleanupHierarchyData(mockLine, hierarchyDefinition);
                });
            }
        }
    }
    private cleanupHierarchyData(mockEntry: any, hierarchyDefinition: Omit<HierarchyDefinition, 'sourceReference'>) {
        if (hierarchyDefinition.matchedProperty) {
            deleteData(mockEntry, hierarchyDefinition.matchedProperty);
            delete mockEntry[hierarchyDefinition.matchedProperty];
        }
        if (hierarchyDefinition.matchedDescendantCountProperty) {
            deleteData(mockEntry, hierarchyDefinition.matchedDescendantCountProperty);
            delete mockEntry[hierarchyDefinition.matchedDescendantCountProperty];
        }
        if (hierarchyDefinition.limitedDescendantCountProperty) {
            deleteData(mockEntry, hierarchyDefinition.limitedDescendantCountProperty);
            delete mockEntry[hierarchyDefinition.limitedDescendantCountProperty];
        }
        if (hierarchyDefinition.drillStateProperty) {
            deleteData(mockEntry, hierarchyDefinition.drillStateProperty);
            delete mockEntry[hierarchyDefinition.drillStateProperty];
        }
        if (hierarchyDefinition.distanceFromRootProperty) {
            deleteData(mockEntry, hierarchyDefinition.distanceFromRootProperty);
            delete mockEntry[hierarchyDefinition.distanceFromRootProperty];
        }
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
        property: Property,
        type: string,
        complexType: ComplexType | TypeDefinition | undefined,
        defaultValue?: any
    ): any {
        if (this.__forceNullableValuesToNull && property.nullable) {
            return null;
        }
        if (complexType) {
            if (complexType._type === 'ComplexType') {
                const outData: any = {};
                complexType.properties.forEach((subProp: any) => {
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
        property: Property,
        complexType: ComplexType | TypeDefinition | undefined,
        propertyName: string,
        lineIndex: number
    ): any {
        if (this.__forceNullableValuesToNull && property.nullable) {
            return null;
        }
        let type = property.type;
        if (complexType) {
            const outData: any = {};
            if (complexType._type === 'ComplexType') {
                complexType.properties.forEach((subProp: any) => {
                    outData[subProp.name] = this.getRandomValueFromType(
                        subProp,
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
                if (property.maxLength) {
                    const remainingLength = property.maxLength - getNumberLength(lineIndex) - 2;
                    return `${propertyName.substring(0, remainingLength)}_${lineIndex}`;
                }
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
        this._entityType.entityProperties.forEach((property: Property) => {
            outObj[property.name] = this.getDefaultValueFromType(
                property,
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
        const propertyName = property.name;
        let highestIndex: number;
        switch (property.type) {
            case 'Edm.Int32':
                highestIndex = 0;
                currentMockData.forEach((mockLine: any) => {
                    const mockLineIndex = parseInt(mockLine[propertyName], 10);
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
                if (property.maxLength) {
                    const remainingLength = property.maxLength - getNumberLength(lineIndex);
                    return `${propertyName.substring(0, remainingLength)}${lineIndex}`;
                }
                return `${propertyName}_${lineIndex}`;
            default:
                return generateId(12);
        }
    }

    generateMockDataLine(iIndex: number, mockData: any) {
        const outObj: any = {};
        this._entityType.entityProperties.forEach((property: Property) => {
            if (property.isKey) {
                outObj[property.name] = this.generateKey(property, iIndex, mockData);
            } else {
                outObj[property.name] = this.getRandomValueFromType(
                    property,
                    property.targetType,
                    property.name,
                    iIndex
                );
            }
        });
        this._entityType.navigationProperties.forEach((navigationProperty: NavigationProperty) => {
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
     * @returns the modified action data
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
     * @returns the action's result
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
     * @returns the modified response
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
                if (literal) {
                    if (Array.isArray(literal)) {
                        targetDateLiteral = literal.map((literalValue) => {
                            if (literalValue.startsWith("datetime'")) {
                                return literalValue.substring(9, literalValue.length - 1);
                            }
                            return literalValue;
                        });
                    } else {
                        if (literal.startsWith("datetime'")) {
                            targetDateLiteral = literal.substring(9, literal.length - 1);
                        }
                    }
                }

                const testValue = new Date(targetDateLiteral).getTime();
                const mockValueDate = new Date(mockValue).getTime();
                isValid = performSimpleComparison(operator, mockValueDate, testValue);
                break;
            case 'Edm.String':
            case 'Edm.Guid':
            default:
                let targetLiteral = literal;
                if (literal) {
                    if (Array.isArray(literal)) {
                        targetLiteral = literal.map((literalValue) => {
                            if (literalValue.startsWith("guid'")) {
                                return literalValue.substring(5, literalValue.length - 1);
                            } else if (literalValue.startsWith("'")) {
                                return literalValue.substring(1, literalValue.length - 1);
                            } else {
                                return literalValue;
                            }
                        });
                    } else {
                        if (literal.startsWith("guid'")) {
                            targetLiteral = literal.substring(5, literal.length - 1);
                        } else if (literal.startsWith("'")) {
                            targetLiteral = literal.substring(1, literal.length - 1);
                        }
                    }
                }

                isValid = performSimpleComparison(operator, mockValue?.toString(), targetLiteral);
                break;
        }
        return isValid;
    }

    getReferentialConstraints(_navigationProperty: NavigationProperty): PartialReferentialConstraint[] | undefined {
        return _navigationProperty.referentialConstraint;
    }
    getSourceReference(aggregationAnnotation: RecursiveHierarchy) {
        const parentNavigationProperty = aggregationAnnotation.ParentNavigationProperty;

        if (!parentNavigationProperty.$target) {
            throw new Error(`Unknown ParentNavigationProperty: '${parentNavigationProperty.value}'`);
        }
        const referentialConstraint = this.getReferentialConstraints(parentNavigationProperty.$target);
        if (!referentialConstraint || referentialConstraint.length === 0) {
            throw new Error(
                `Referential constraints must be defined for the ParentNavigationProperty: '${parentNavigationProperty.value}'`
            );
        }

        return referentialConstraint[0].sourceProperty;
    }
    buildTree(
        hierarchyNode: any,
        allItems: Record<string, any[]>,
        idNode: string,
        depth: number = 0,
        parentNode: any
    ): any {
        const id = getData(hierarchyNode, idNode);
        const children = allItems[id];
        const resultingChildren: any[] = [];
        if (children) {
            for (const child of children) {
                //if (child.$inResultSet === true || child.$inResultSet === undefined) {
                resultingChildren.push(this.buildTree(child, allItems, idNode, depth + 1, hierarchyNode));
                //}
            }
        }
        hierarchyNode.$parent = parentNode;
        hierarchyNode.$children = resultingChildren;
        hierarchyNode.$rootDistance = depth;
        return hierarchyNode;
    }
    buildHierarchyTree(hierarchyQualifier: string, inputSet: any[], hierarchyDefinition: HierarchyDefinition) {
        //if (!this._hierarchyTree[hierarchyQualifier]) {
        const itemPerParents: Record<string, any[]> = {};

        inputSet.forEach((item: any) => {
            if (
                !this._mockDataEntitySet.isDraft() ||
                (item.IsActiveEntity !== false && item.HasActiveEntity === true)
            ) {
                const parentItemValue = getData(item, hierarchyDefinition.sourceReference) ?? '';
                if (!itemPerParents[parentItemValue]) {
                    itemPerParents[parentItemValue] = [];
                }
                itemPerParents[parentItemValue].push(item);
            }
        });
        this._hierarchyTree[hierarchyQualifier] = itemPerParents;

        return this._hierarchyTree[hierarchyQualifier];
    }
    flattenTree(
        currentNode: any,
        outItems: any[],
        nodeProperty: string,
        hierarchyDefinition: HierarchyDefinition,
        depth: number,
        toExpand: ToExpand[] = [],
        toCollapse: string[] = [],
        toShow: string[] = [],
        toShowAncestors: string[] = [],
        forceExpand: boolean = false
    ) {
        let descendantCount = 0;
        const currentNodeProperty = getData(currentNode, nodeProperty);
        const shouldShowAncestor = toShowAncestors.includes(currentNodeProperty);
        if (currentNode && (depth < 0 || depth > 0 || forceExpand || shouldShowAncestor)) {
            const shouldExpand = toExpand.find((toExpand) => toExpand.name === currentNodeProperty);
            if (shouldExpand) {
                depth += shouldExpand.depth;
            }

            const shouldShow = toShow.includes(currentNodeProperty);
            if (shouldShowAncestor && !shouldExpand) {
                forceExpand = true;
            }
            if (shouldShow && !shouldShowAncestor) {
                depth = 1;
            }
            const shouldCollapse = toCollapse.includes(currentNodeProperty);
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

            if (hierarchyDefinition.distanceFromRootProperty) {
                setData(currentNode, hierarchyDefinition.distanceFromRootProperty, currentNode.$rootDistance);
            }

            if (hierarchyDefinition.drillStateProperty) {
                if (currentNode.$children?.length === 0) {
                    setData(currentNode, hierarchyDefinition.drillStateProperty, 'leaf');
                } else if (isLastLevel && !shouldShowAncestor) {
                    setData(currentNode, hierarchyDefinition.drillStateProperty, 'collapsed');
                } else {
                    setData(currentNode, hierarchyDefinition.drillStateProperty, 'expanded');
                }
            }
            const children = currentNode.$children ?? [];
            children.forEach((child: any) => {
                descendantCount += this.flattenTree(
                    child,
                    outItems,
                    nodeProperty,
                    hierarchyDefinition,
                    depth - 1,
                    toExpand,
                    toCollapse,
                    toShow,
                    toShowAncestors,
                    forceExpand
                );
            });
            if (hierarchyDefinition.limitedDescendantCountProperty) {
                setData(
                    currentNode,
                    hierarchyDefinition.limitedDescendantCountProperty,
                    isLastLevel && !shouldShowAncestor ? 0 : descendantCount
                );
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
        hierarchyDefinition: HierarchyDefinition,
        depth: number,
        matchedChildrenCount: number,
        matchedProperties: any[],
        isDraft: boolean
    ) {
        let descendantCount = 0;
        if (currentNode && (depth < 0 || depth > 0)) {
            const isLastLevel = depth === 1;
            if (outItems.includes(currentNode)) {
                if (hierarchyDefinition.matchedDescendantCountProperty) {
                    const currentValue = getData(currentNode, hierarchyDefinition.matchedDescendantCountProperty);
                    setData(
                        currentNode,
                        hierarchyDefinition.matchedDescendantCountProperty,
                        currentValue + matchedChildrenCount
                    );
                }
            } else {
                outItems.push(currentNode);

                if (hierarchyDefinition.matchedDescendantCountProperty) {
                    setData(currentNode, hierarchyDefinition.matchedDescendantCountProperty, matchedChildrenCount);
                }
                if (hierarchyDefinition.matchedProperty) {
                    setData(
                        currentNode,
                        hierarchyDefinition.matchedProperty,
                        !!matchedProperties.find((prop) =>
                            compareRowData(prop, currentNode, nodeProperty, nodeProperty, isDraft)
                        )
                    );
                    if (getData(currentNode, hierarchyDefinition.matchedProperty)) {
                        matchedChildrenCount++;
                    }
                }
                if (hierarchyDefinition.distanceFromRootProperty) {
                    setData(currentNode, hierarchyDefinition.distanceFromRootProperty, currentNode.$rootDistance);
                }

                if (hierarchyDefinition.drillStateProperty) {
                    const includedChildrenCount =
                        currentNode.$children?.filter((child: any) => child.$inResultSet).length ?? 0;
                    if (isLastLevel && includedChildrenCount === 0) {
                        setData(currentNode, hierarchyDefinition.drillStateProperty, 'leaf');
                    } else if (isLastLevel) {
                        setData(currentNode, hierarchyDefinition.drillStateProperty, 'collapsed');
                    } else {
                        setData(currentNode, hierarchyDefinition.drillStateProperty, 'expanded');
                    }
                }
            }
            if (currentNode.$parent) {
                this.getAncestorsOfNode(
                    currentNode.$parent,
                    outItems,
                    nodeProperty,
                    hierarchyDefinition,
                    depth - 1,
                    matchedChildrenCount,
                    matchedProperties,
                    isDraft
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
            const nodeProperty = getNodeProperty(aggregationAnnotation)!;
            let adjustedData = data.map((adjustedRowData: any) => {
                const item = this._mockData.find((dataItem: any) =>
                    compareRowData(
                        dataItem,
                        adjustedRowData,
                        nodeProperty,
                        nodeProperty,
                        this._mockDataEntitySet.isDraft()
                    )
                );
                return { ...item, ...adjustedRowData, ...{ $inResultSet: true } };
            });
            const restOfData = this._mockData
                .filter((item: any) => {
                    return !data.find((dataItem: any) =>
                        compareRowData(dataItem, item, nodeProperty, nodeProperty, this._mockDataEntitySet.isDraft())
                    );
                })
                .map((item: any) => {
                    return { ...item, ...{ $inResultSet: false } };
                });
            adjustedData = adjustedData.concat(restOfData);
            const hierarchyDefinition = this.getHierarchyDefinition(hierarchyQualifier);
            const hierarchyNodes = this.buildHierarchyTree(hierarchyQualifier, adjustedData, hierarchyDefinition);
            const sourceReference = this.getSourceReference(aggregationAnnotation);
            // TODO Considering the input set the top level node is not necessarely the root node
            const allRootNodes = adjustedData.filter((node) => {
                const parent = adjustedData.find((parent) =>
                    compareRowData(parent, node, nodeProperty, sourceReference, this._mockDataEntitySet.isDraft())
                );
                return !parent || !parent.$inResultSet;
            });
            allRootNodes.sort((a) => {
                if (a.$rootDistance === undefined) {
                    return -1;
                }
                return 1;
            });

            // If no 'Levels' value is specified, then all levels are returned
            const depth: number = _parameters.Levels ? parseInt(_parameters.Levels, 10) : Number.POSITIVE_INFINITY;

            const toExpand: ToExpand[] =
                _parameters.Expand?.map((expand) => {
                    return { name: expand.substring(1, expand.length - 1), depth: 1 };
                }) ?? [];
            const toShow = _parameters.Show?.map((collapse) => collapse.substring(1, collapse.length - 1)) ?? [];
            if (_parameters.ExpandLevels) {
                for (const expandLevels of _parameters.ExpandLevels) {
                    toExpand.push({
                        name: expandLevels['"NodeID"'].substring(1, expandLevels['"NodeID"'].length - 1),
                        depth: parseInt(expandLevels['"Levels"'], 10)
                    });
                }
            }
            const toShowAncestors: string[] = [];
            for (const nodeId of toShow) {
                const node = this._mockData.find((node: any) => getData(node, nodeProperty) === nodeId);
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
                        toShowAncestors.push(getData(ancestor, nodeProperty));
                    });
                }
            }
            allRootNodes.forEach((rootNode) => {
                const hierarchy = this.buildTree(rootNode, hierarchyNodes, nodeProperty, 0, undefined);
                this.flattenTree(
                    hierarchy,
                    outItems,
                    nodeProperty,
                    hierarchyDefinition,
                    depth,
                    toExpand,
                    _parameters.Collapse?.map((collapse) => collapse.substring(1, collapse.length - 1)),
                    toShow,
                    toShowAncestors
                );
            });

            let outData: object[] = [];
            outItems.forEach((item: any) => {
                const subTreeData = data.find((dataItem: any) =>
                    compareRowData(dataItem, item, nodeProperty, nodeProperty, this._mockDataEntitySet.isDraft())
                );
                const nodePropertyValue = getData(item, nodeProperty);
                if (subTreeData) {
                    if (
                        hierarchyDefinition.matchedDescendantCountProperty &&
                        hierarchyDefinition.drillStateProperty &&
                        getData(item, hierarchyDefinition.matchedDescendantCountProperty) === 0
                    ) {
                        setData(item, hierarchyDefinition.drillStateProperty, 'leaf');
                    }
                    outData.push({ ...subTreeData, ...item });
                } else if (toShow.includes(nodePropertyValue) || toShowAncestors.includes(nodePropertyValue)) {
                    outData.push(item);
                }
            });
            // restrict tree data with skiplocation && skipcontext
            if (_odataRequest.skipLocation) {
                let skipLocation = _odataRequest.skipLocation.split('(')[1].split(')')[0];
                skipLocation = skipLocation.substring(1, skipLocation.length - 1);
                const skipLocationIndex = outData.findIndex(
                    (item: any) => getData(item, nodeProperty) === skipLocation
                );
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
        const hierarchyDefinition = this.getHierarchyDefinition(_parameters.qualifier);

        if (aggregationAnnotation) {
            const nodeProperty = getNodeProperty(aggregationAnnotation)!;
            const adjustedData = this._mockData.map((item: any) => {
                const adjustedRowData = hierarchyFilter.find((dataItem: any) =>
                    compareRowData(dataItem, item, nodeProperty, nodeProperty, this._mockDataEntitySet.isDraft())
                );
                if (adjustedRowData) {
                    return { ...item, ...adjustedRowData, ...{ $inResultSet: true } };
                } else {
                    return { ...item, ...{ $inResultSet: false } };
                }
            });
            const hierarchyNodes = this.buildHierarchyTree(_parameters.qualifier, adjustedData, hierarchyDefinition);
            const sourceReference = this.getSourceReference(aggregationAnnotation);
            const rootNodes = hierarchyNodes[''];
            rootNodes.forEach((rootNode: any) => {
                this.buildTree(rootNode, hierarchyNodes, nodeProperty, 0, undefined);
            });

            const subTrees: object[] = [];
            hierarchyFilter.forEach((item: any) => {
                const parentNodeChildren = hierarchyNodes[getData(item, sourceReference) ?? ''];
                if (parentNodeChildren) {
                    const currentNode = parentNodeChildren.find((node: any) =>
                        compareRowData(node, item, nodeProperty, nodeProperty, this._mockDataEntitySet.isDraft())
                    );
                    if (_parameters.keepStart) {
                        if (hierarchyDefinition.matchedProperty) {
                            // TODO compare with lastFilterTransformationResult
                            setData(currentNode, hierarchyDefinition.matchedProperty, true);
                        }
                        subTrees.push(currentNode);
                    }
                    currentNode.$children?.forEach((child: any) => {
                        this.flattenTree(
                            child,
                            subTrees,
                            nodeProperty,
                            hierarchyDefinition,
                            _parameters.maximumDistance
                        );
                    });
                }
            });
            const outData: object[] = [];
            inputSet.forEach((item: any) => {
                const subTreeData: any = subTrees.find((dataItem: any) =>
                    compareRowData(dataItem, item, nodeProperty, nodeProperty, this._mockDataEntitySet.isDraft())
                );
                if (subTreeData) {
                    if (
                        hierarchyDefinition.matchedDescendantCountProperty &&
                        hierarchyDefinition.drillStateProperty &&
                        getData(item, hierarchyDefinition.matchedDescendantCountProperty) === 0
                    ) {
                        setData(subTreeData, hierarchyDefinition.drillStateProperty, 'leaf');
                    }
                    outData.push({ ...item, ...subTreeData });
                }
            });
            return outData;
        } else {
            return [];
        }
    }

    getHierarchyDefinition(hierarchyQualifier: string): HierarchyDefinition;
    getHierarchyDefinition(
        hierarchyQualifier: string,
        excludeSourceRef: true
    ): Omit<HierarchyDefinition, 'sourceReference'>;
    getHierarchyDefinition(
        hierarchyQualifier: string,
        excludeSourceRef: boolean = false
    ): typeof excludeSourceRef extends false ? HierarchyDefinition : Omit<HierarchyDefinition, 'sourceReference'> {
        const hierarchyAnnotation = this._entityType.annotations?.Hierarchy?.[
            `RecursiveHierarchy#${hierarchyQualifier}`
        ] as any;
        let sourceReference;
        if (excludeSourceRef === false) {
            const aggregationAnnotation =
                this._entityType.annotations?.Aggregation?.[`RecursiveHierarchy#${hierarchyQualifier}`];
            sourceReference = this.getSourceReference(aggregationAnnotation!);
            return {
                distanceFromRootProperty:
                    getPathOrPropertyPath(hierarchyAnnotation.DistanceFromRootProperty) ?? '$$distanceFromRootProperty',
                drillStateProperty:
                    getPathOrPropertyPath(hierarchyAnnotation.DrillStateProperty) ?? '$$drillStateProperty',
                limitedDescendantCountProperty:
                    getPathOrPropertyPath(hierarchyAnnotation.LimitedDescendantCountProperty) ??
                    '$$limitedDescendantCountProperty',
                matchedDescendantCountProperty:
                    getPathOrPropertyPath(hierarchyAnnotation.MatchedDescendantCountProperty) ??
                    '$$matchedDescendantCountProperty',
                matchedProperty: getPathOrPropertyPath(hierarchyAnnotation.MatchedProperty) ?? '$$matchedProperty',
                sourceReference
            } as HierarchyDefinition;
        }
        return {
            distanceFromRootProperty: getPathOrPropertyPath(hierarchyAnnotation.DistanceFromRootProperty),
            drillStateProperty: getPathOrPropertyPath(hierarchyAnnotation.DrillStateProperty),
            limitedDescendantCountProperty: getPathOrPropertyPath(hierarchyAnnotation.LimitedDescendantCountProperty),
            matchedDescendantCountProperty: getPathOrPropertyPath(hierarchyAnnotation.MatchedDescendantCountProperty),
            matchedProperty: getPathOrPropertyPath(hierarchyAnnotation.MatchedProperty)
        };
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
        const hierarchyDefinition = this.getHierarchyDefinition(_parameters.qualifier);

        if (aggregationAnnotation) {
            const nodeProperty = getNodeProperty(aggregationAnnotation)!;
            const sourceReference = this.getSourceReference(aggregationAnnotation);
            const adjustedData = this._mockData.map((item: any) => {
                const adjustedRowData = limitedHierarchy.find((dataItem: any) =>
                    compareRowData(item, dataItem, nodeProperty, nodeProperty, this._mockDataEntitySet.isDraft())
                );
                if (adjustedRowData) {
                    return { ...item, ...adjustedRowData, ...{ $inResultSet: true } };
                } else {
                    return { ...item, ...{ $inResultSet: false } };
                }
            });
            const hierarchyNodes = this.buildHierarchyTree(_parameters.qualifier, adjustedData, hierarchyDefinition);
            const rootNodes = hierarchyNodes[''];
            rootNodes.forEach((rootNode: any) => {
                this.buildTree(rootNode, hierarchyNodes, nodeProperty, 0, undefined);
            });
            const ancestors: any[] = [];
            limitedHierarchy.forEach((item: any) => {
                const parentNodeChildren = hierarchyNodes[getData(item, sourceReference) ?? ''];
                const currentNode = parentNodeChildren.find((node: any) =>
                    compareRowData(node, item, nodeProperty, nodeProperty, this._mockDataEntitySet.isDraft())
                );
                if (_parameters.keepStart) {
                    this.getAncestorsOfNode(
                        currentNode,
                        ancestors,
                        nodeProperty,
                        hierarchyDefinition,
                        _parameters.maximumDistance - 1,
                        0,
                        lastFilterTransformationResult,
                        this._mockDataEntitySet.isDraft()
                    );
                } else if (currentNode && currentNode.$parent) {
                    this.getAncestorsOfNode(
                        currentNode.$parent,
                        ancestors,
                        nodeProperty,
                        hierarchyDefinition,
                        _parameters.maximumDistance - 1,
                        1,
                        lastFilterTransformationResult,
                        this._mockDataEntitySet.isDraft()
                    );
                }
            });
            const outData: object[] = [];
            inputSet.forEach((item: any) => {
                const subTreeData = ancestors.find((dataItem: any) =>
                    compareRowData(dataItem, item, nodeProperty, nodeProperty, this._mockDataEntitySet.isDraft())
                );
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
