export type SelectDefinition = Record<string, boolean>;

export function parse$select($select: string | null): SelectDefinition {
    if ($select) {
        return $select.split(',').reduce((selectDefinition: SelectDefinition, property) => {
            if (property.length > 0) {
                selectDefinition[property.split('/', 1)[0]] = true;
            }
            return selectDefinition;
        }, {});
    }

    return { '*': true };
}
