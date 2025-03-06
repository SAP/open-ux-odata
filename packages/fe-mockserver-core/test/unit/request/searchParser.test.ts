import { parseSearch } from '../../../src/request/searchParser';

describe('Search Parser', () => {
    test('can parse basic search', async () => {
        const nonProvided = parseSearch('');
        expect(nonProvided).toStrictEqual([]);

        const basicText = parseSearch('Country_Code');
        expect(basicText[0]).toBe('Country_Code');

        const basicTextWithSpace = parseSearch('"Hello World"');
        expect(basicTextWithSpace[0]).toBe('Hello World');

        const multipleText = parseSearch('Hello World');
        expect(multipleText[0]).toBe('Hello');
        expect(multipleText[1]).toBe('World');

        const multipleTextWithSpace = parseSearch('"Hello" "World"');
        expect(multipleTextWithSpace[0]).toBe('Hello');
        expect(multipleTextWithSpace[1]).toBe('World');

        const multipleTextWithSpace2 = parseSearch('"Hello Horld" "World"');
        expect(multipleTextWithSpace2[0]).toBe('Hello Horld');
        expect(multipleTextWithSpace2[1]).toBe('World');
    });
    test('can parse search with an OR', () => {
        const ORCheck = parseSearch('"ORANGE"');
        expect(ORCheck[0]).toBe('ORANGE');
    });
});
