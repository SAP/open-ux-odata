import cloneDeep from 'lodash.clonedeep';
import { generateId, uuidv4 } from '../data/common';
import type { Action, ComplexType, EntityType, Property, TypeDefinition } from '@sap-ux/vocabularies-types';
import type { EntitySetInterface } from '../data/common';

export type KeyDefinitions = Record<string, number | boolean | string>;

export class FileBasedMockData {
    protected _mockData: object[];
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
                    this._entityType.entityProperties.forEach((prop) => {
                        if (prop.targetType && prop.targetType._type === 'ComplexType' && !mockLine[prop.name]) {
                            mockLine[prop.name] = {};
                            prop.targetType.properties.forEach((subProp) => {
                                mockLine[prop.name][subProp.name] = this.getDefaultValueFromType(
                                    subProp.type,
                                    subProp.targetType,
                                    subProp.defaultValue
                                );
                            });
                        }
                    });
                });
            }
        }
    }

    async addEntry(mockEntry: any): Promise<void> {
        this._mockData.push(mockEntry);
    }

    async updateEntry(keyValues: KeyDefinitions, updatedData: object): Promise<void> {
        const dataIndex = this.getDataIndex(keyValues);
        this._mockData[dataIndex] = updatedData;
    }

    fetchEntries(keyValues: KeyDefinitions): object[] {
        const keys = this._entityType.keys;
        return this._mockData.filter((mockData) => {
            return Object.keys(keyValues).every(this.checkKeyValues(mockData, keyValues, keys));
        });
    }

    hasEntry(keyValues: KeyDefinitions): boolean {
        return this.getDataIndex(keyValues) !== -1;
    }

    hasEntries(): boolean {
        return this._mockData.length > 0;
    }

    getAllEntries(dontClone: boolean = false): object[] {
        if (dontClone) {
            return this._mockData;
        }
        return cloneDeep(this._mockData);
    }

    protected getDataIndex(keyValues: KeyDefinitions): number {
        const keys = this._entityType.keys;
        return this._mockData.findIndex((mockData) => {
            return Object.keys(keyValues).every(this.checkKeyValues(mockData, keyValues, keys));
        });
    }

    private checkKeyValues(mockData: object, keyValues: KeyDefinitions, keys: Property[]) {
        return (keyName: string) => {
            return this._mockDataEntitySet.checkKeyValue(
                mockData,
                keyValues,
                keyName,
                keys.find((keyProp) => keyProp.name === keyName) as Property
            );
        };
    }

    async removeEntry(keyValues: KeyDefinitions): Promise<void> {
        const dataIndex = this.getDataIndex(keyValues);
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

    getEmptyObject(): object {
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

    getDefaultElement(): object {
        if (this._mockData && !Array.isArray(this._mockData)) {
            return this._mockData;
        } else if (this._mockData.length >= 1) {
            return cloneDeep(this._mockData[0]);
        } else {
            return this.getEmptyObject();
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
     */
    async onBeforeAction(_actionDefinition: Action, actionData: any, _keys: Record<string, any>): Promise<object> {
        return actionData;
    }
    /**
     * Do something with the action.
     *
     * @param _actionDefinition
     * @param actionData
     * @param _keys
     */
    async executeAction(_actionDefinition: Action, actionData: any, _keys: Record<string, any>): Promise<object> {
        return actionData;
    }

    /**
     * Allow to modify the response data.
     *
     * @param _actionDefinition
     * @param _actionData
     * @param _keys
     * @param responseData
     */
    async onAfterAction(
        _actionDefinition: Action,
        _actionData: any,
        _keys: Record<string, any>,
        responseData: any
    ): Promise<any> {
        return responseData;
    }

    //eslint-disable-next-line
    async onAfterUpdateEntry(_keyValues: KeyDefinitions, _updatedData: object): Promise<void> {
        // DO Nothing
    }
    //eslint-disable-next-line
    async onBeforeUpdateEntry(_keyValues: KeyDefinitions, _updatedData: object): Promise<void> {
        // DO Nothing
    }
    //eslint-disable-next-line
    hasCustomAggregate(_customAggregateName: string): boolean {
        return false;
    }
    //eslint-disable-next-line
    performCustomAggregate(_customAggregateName: string, _dataToAggregate: any[]): any {
        // DO Nothing
    }
}
