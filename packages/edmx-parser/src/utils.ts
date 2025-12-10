/**
 * Given an object that is either an array or a single element, make sure the output it always wrapped as an array.
 *
 * @param sourceObject an object or an array
 * @returns either the original array or the same element wrapped in an arrays
 */
import type {
    AnnotationList,
    RawAction,
    RawActionImport,
    RawAssociation,
    RawAssociationSet,
    RawComplexType,
    RawEntityContainer,
    RawEntitySet,
    RawEntityType,
    RawEnumType,
    RawMetadata,
    RawSchema,
    RawSingleton,
    RawTypeDefinition,
    Reference
} from '@sap-ux/vocabularies-types';

/**
 * Either returns the sourceObject or the sourceObject wrapped in an array.
 *
 * @param sourceObject the object you want to check
 * @returns the source object wrapped in an array.
 */
export function ensureArray<T>(sourceObject: T | T[] | undefined): T[] {
    if (sourceObject === undefined || sourceObject === null) {
        return [];
    }
    if (Array.isArray(sourceObject)) {
        return sourceObject;
    } else {
        return [sourceObject];
    }
}

/**
 *
 */
export class RawMetadataInstance implements RawMetadata {
    references: Reference[];
    schema: RawSchema;
    version: string;
    identification: string;

    /**
     * @param fileIdentification the name of the file you are parsing, mostly for reference
     * @param version the version of the metadata currently evaluated
     * @param schema the parsed schema
     * @param references a list of all the references currently used in your file
     */
    constructor(fileIdentification: string, version: string, schema: RawSchema, references: Reference[]) {
        this.identification = fileIdentification;
        this.references = references;
        this.version = version;
        this.schema = schema;
    }
}

/**
 *
 */
export class MergedRawMetadata implements RawMetadataInstance {
    get references(): Reference[] {
        return this._references;
    }

    get schema(): RawSchema {
        return {
            associations: this._associations,
            associationSets: this._associationSets,
            annotations: this._annotations,
            entityContainer: this._entityContainer,
            namespace: this._namespace,
            entitySets: this._entitySets,
            singletons: this._singletons,
            complexTypes: this._complexTypes,
            enumTypes: this._enumTypes,
            typeDefinitions: this._typeDefinitions,
            actions: this._actions,
            actionImports: this._actionImports,
            entityTypes: this._entityTypes
        };
    }

    version: string;
    identification: string;
    _references: Reference[] = [];
    _namespace: string;
    _parserOutput: RawMetadata[] = [];
    _annotations: { [id: string]: AnnotationList[] } = {};
    _associations: RawAssociation[] = [];
    _associationSets: RawAssociationSet[] = [];
    _entitySets: RawEntitySet[] = [];
    _singletons: RawSingleton[] = [];
    _actions: RawAction[] = [];
    _actionImports: RawActionImport[] = [];
    _entityContainer: RawEntityContainer = {
        _type: 'EntityContainer',
        fullyQualifiedName: ''
    };
    _entityTypes: RawEntityType[] = [];
    _complexTypes: RawComplexType[] = [];
    _enumTypes: RawEnumType[] = [];
    _typeDefinitions: RawTypeDefinition[] = [];

    /**
     * @param initialParserOutput
     */
    constructor(initialParserOutput: RawMetadata) {
        this.identification = 'mergedParserInstance';
        this.version = initialParserOutput.version;
        this._namespace = initialParserOutput.schema.namespace;
    }

    /**
     * @param parserOutput
     */
    public addParserOutput(parserOutput: RawMetadata): void {
        this._parserOutput.push(parserOutput);
        this._references = this._references.concat(parserOutput.references);
        this._associations = this._associations.concat(parserOutput.schema.associations);
        this._associationSets = this._associationSets.concat(parserOutput.schema.associationSets);
        this._annotations = Object.assign(this._annotations, parserOutput.schema.annotations);
        this._entitySets = this._entitySets.concat(parserOutput.schema.entitySets);
        this._singletons = this._singletons.concat(parserOutput.schema.singletons);
        this._actions = this._actions.concat(parserOutput.schema.actions);
        this._actionImports = this._actionImports.concat(parserOutput.schema.actionImports);
        this._entityTypes = this._entityTypes.concat(parserOutput.schema.entityTypes);
        this._complexTypes = this._complexTypes.concat(parserOutput.schema.complexTypes);
        this._enumTypes = this._enumTypes.concat(parserOutput.schema.enumTypes);
        this._typeDefinitions = this._typeDefinitions.concat(parserOutput.schema.typeDefinitions);
        if (parserOutput.schema.entityContainer.fullyQualifiedName.length > 0) {
            this._entityContainer = Object.assign(this._entityContainer, parserOutput.schema.entityContainer);
        }
    }
}
