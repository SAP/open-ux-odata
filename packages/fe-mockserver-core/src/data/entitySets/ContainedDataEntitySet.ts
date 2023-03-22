import type { EntitySet, EntityType } from '@sap-ux/vocabularies-types';
import type { DataAccessInterface } from '../common';
import { MockDataEntitySet } from './entitySet';

export class ContainedDataEntitySet extends MockDataEntitySet {
    constructor(entitySetDefinition: EntitySet | EntityType, containedData: any, dataAccess: DataAccessInterface) {
        super('', entitySetDefinition, dataAccess, false, false);
        this._rootMockData = containedData;
        this.readyPromise = Promise.resolve(this);
    }
}
