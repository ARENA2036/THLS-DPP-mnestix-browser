import { parseXmlToJson, processVecData, flattenLocalizedStrings } from './fileHelper';

describe('parseXmlToJson', () => {
    it('should return a raw string for text-only elements', () => {
        const xml = '<Root><Name>Hello</Name></Root>';
        const result = parseXmlToJson(xml);
        expect(result).toEqual({ Name: 'Hello' });
    });

    it('should preserve attributes when element also has text content', () => {
        const xml = '<Root><Item id="42">some text</Item></Root>';
        const result = parseXmlToJson(xml);
        expect(result).toEqual({
            Item: { _id: '42', __text: 'some text' },
        });
    });

    it('should preserve child elements when element also has text content', () => {
        const xml = '<Root><Parent>mixed<Child>nested</Child></Parent></Root>';
        const result = parseXmlToJson(xml);
        expect(result).toEqual({
            Parent: { Child: 'nested', __text: 'mixed' },
        });
    });

    it('should preserve both attributes and child elements alongside text', () => {
        const xml = '<Root><Parent id="1">text<Child>val</Child></Parent></Root>';
        const result = parseXmlToJson(xml);
        expect(result).toEqual({
            Parent: { _id: '1', Child: 'val', __text: 'text' },
        });
    });

    it('should flatten attributes with _ prefix', () => {
        const xml = '<Root><Spec id="foo" xsi:type="vec:Net">content</Spec></Root>';
        const result = parseXmlToJson(xml);
        expect(result).toEqual({
            Spec: { _id: 'foo', '_xsi:type': 'vec:Net', __text: 'content' },
        });
    });

    it('should create arrays for repeated sibling elements', () => {
        const xml = '<Root><Item>A</Item><Item>B</Item><Item>C</Item></Root>';
        const result = parseXmlToJson(xml);
        expect(result).toEqual({ Item: ['A', 'B', 'C'] });
    });

    it('should handle nested structures correctly', () => {
        const xml = `
            <VecContent>
                <VecVersion>1.1.3</VecVersion>
                <GeneratingSystemName>PREEvision</GeneratingSystemName>
                <DocumentVersion>
                    <CompanyName>VI</CompanyName>
                    <DocumentNumber>0</DocumentNumber>
                </DocumentVersion>
            </VecContent>`;
        const result = parseXmlToJson(xml);
        expect(result).toEqual({
            VecVersion: '1.1.3',
            GeneratingSystemName: 'PREEvision',
            DocumentVersion: {
                CompanyName: 'VI',
                DocumentNumber: '0',
            },
        });
    });

    it('should return empty object for element with no content', () => {
        const xml = '<Root><Empty/></Root>';
        const result = parseXmlToJson(xml);
        expect(result).toEqual({ Empty: {} });
    });

    it('should handle attributes-only element (no text, no children)', () => {
        const xml = '<Root><Tag id="x"/></Root>';
        const result = parseXmlToJson(xml);
        expect(result).toEqual({ Tag: { _id: 'x' } });
    });
});

describe('flattenLocalizedStrings', () => {
    it('should flatten VEC LocalizedString objects to their Value', () => {
        const input = {
            Description: {
                '_xsi:type': 'ns2:LocalizedString',
                _id: 'id_123',
                LanguageCode: 'De',
                Value: 'Trennstelle_TCPL',
            },
            CompanyName: 'GCMC',
        };
        expect(flattenLocalizedStrings(input)).toEqual({
            Description: 'Trennstelle_TCPL',
            CompanyName: 'GCMC',
        });
    });

    it('should flatten nested LocalizedString objects recursively', () => {
        const input = {
            PartVersion: {
                _id: 'id_1',
                Abbreviation: { _id: 'id_2', LanguageCode: 'De', Value: 'MB2' },
                Description: {
                    '_xsi:type': 'ns2:LocalizedString',
                    _id: 'id_3',
                    LanguageCode: 'De',
                    Value: 'Massebolzen M8',
                },
                CompanyName: 'GCMC',
            },
        };
        expect(flattenLocalizedStrings(input)).toEqual({
            PartVersion: {
                _id: 'id_1',
                Abbreviation: 'MB2',
                Description: 'Massebolzen M8',
                CompanyName: 'GCMC',
            },
        });
    });

    it('should handle arrays containing LocalizedString objects', () => {
        const input = {
            Items: [
                { Description: { LanguageCode: 'De', Value: 'Item A' }, Name: 'A' },
                { Description: { LanguageCode: 'En', Value: 'Item B' }, Name: 'B' },
            ],
        };
        expect(flattenLocalizedStrings(input)).toEqual({
            Items: [
                { Description: 'Item A', Name: 'A' },
                { Description: 'Item B', Name: 'B' },
            ],
        });
    });

    it('should not flatten objects that do not match LocalizedString pattern', () => {
        const input = {
            Slot: { _id: 'id_slot', Cavity: [{ CavityNumber: '1' }] },
        };
        expect(flattenLocalizedStrings(input)).toEqual({
            Slot: { _id: 'id_slot', Cavity: [{ CavityNumber: '1' }] },
        });
    });
});

describe('processVecData', () => {
    it('should flatten LocalizedString fields in VEC data', () => {
        const input = {
            DocumentVersion: {
                _id: 'id_1',
                Description: {
                    '_xsi:type': 'ns2:LocalizedString',
                    _id: 'id_2',
                    LanguageCode: 'De',
                    Value: 'Trennstelle_TCPL',
                },
                CompanyName: 'GCMC',
            },
        } as Record<string, unknown>;
        const result = processVecData(input);
        expect((result.DocumentVersion as Record<string, unknown>).Description).toBe('Trennstelle_TCPL');
        expect((result.DocumentVersion as Record<string, unknown>).CompanyName).toBe('GCMC');
    });
});
