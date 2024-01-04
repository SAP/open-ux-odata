export type OrderByDefinition = {
    name: string;
    direction: 'asc' | 'desc';
};

export function parse$orderby($orderby: string | null): OrderByDefinition[] {
    if (!$orderby) {
        return [];
    }
    const orderByParams = $orderby.split(',');
    const orderByDefinition: OrderByDefinition[] = [];
    orderByParams.forEach((param) => {
        const [paramName, direction] = param.split(' ');
        const realDirection: 'asc' | 'desc' = ['asc', 'desc'].includes(direction)
            ? (direction as 'asc' | 'desc')
            : 'asc';
        orderByDefinition.push({ name: paramName, direction: realDirection });
    });
    return orderByDefinition;
}
