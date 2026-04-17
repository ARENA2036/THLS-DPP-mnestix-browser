import { DOMParser } from 'xmldom';
import { FileType, FileMetadata } from './types';

/**
 * Helper function to safely get nested values from the parsed data
 * @param obj The object to traverse
 * @param path Dot-separated path to the value (e.g., 'Harness.Company_name')
 * @returns The string value at the path, or null if not found
 */
export function getNestedValue(obj: unknown, path: string): string | null {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
        if (typeof current === 'object' && current !== null && key in (current as Record<string, unknown>)) {
            current = (current as Record<string, unknown>)[key];
        } else {
            return null;
        }
    }

    return typeof current === 'string' ? current : null;
}

/**
 * Parses XML content to JSON
 * @param xmlContent The XML string to parse
 * @returns Parsed JSON object
 */
export function parseXmlToJson(xmlContent: string): Record<string, unknown> {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    function xmlToJson(node: Element): unknown {
        const obj: Record<string, unknown> = {};
        let hasAttributes = false;
        let hasElementChildren = false;
        let textContent = '';

        // Handle attributes — flatten into obj with `_` prefix
        if (node.attributes && node.attributes.length > 0) {
            for (let i = 0; i < node.attributes.length; i++) {
                const attr = node.attributes[i];
                obj[`_${attr.nodeName}`] = attr.nodeValue || '';
                hasAttributes = true;
            }
        }

        // Handle child nodes
        if (node.hasChildNodes()) {
            const children = Array.from(node.childNodes);
            for (const child of children) {
                const childNode = child as Element;
                if (childNode.nodeType === 1) {
                    // Element node
                    hasElementChildren = true;
                    const nodeName = childNode.nodeName;
                    const value = xmlToJson(childNode);

                    if (obj[nodeName]) {
                        // If property already exists, make it an array
                        if (Array.isArray(obj[nodeName])) {
                            (obj[nodeName] as unknown[]).push(value);
                        } else {
                            obj[nodeName] = [obj[nodeName], value];
                        }
                    } else {
                        obj[nodeName] = value;
                    }
                } else if (childNode.nodeType === 3) {
                    // Text node
                    const text = childNode.nodeValue?.trim();
                    if (text) {
                        textContent += text;
                    }
                }
            }
        }

        // Only return a raw string when the element has purely text content
        // (no attributes and no element children). Otherwise keep the object.
        if (!hasAttributes && !hasElementChildren) {
            return textContent;
        }
        if (textContent) {
            obj['__text'] = textContent;
        }

        return obj;
    }

    const result = xmlToJson(xmlDoc.documentElement);
    // Ensure the top-level return is always an object, even if the root
    // element itself is empty/text-only (e.g. `<Root/>` or `<Root>text</Root>`).
    if (typeof result !== 'object' || result === null) {
        return {};
    }
    return result as Record<string, unknown>;
}

/**
 * Detects the file type based on content and file extension
 * @param xmlContent The XML content
 * @param fileName The file name
 * @returns The detected file type
 */
export function detectFileType(xmlContent: string, fileName: string): FileType {
    const lowerFileName = fileName.toLowerCase();

    // Check by file extension first
    if (lowerFileName.endsWith('.kbl')) {
        return 'kbl';
    }
    if (lowerFileName.endsWith('.vec')) {
        return 'vec';
    }

    // Check by content if extension is not conclusive
    if (xmlContent.includes('KBL_container') || xmlContent.includes('KBLSchema')) {
        return 'kbl';
    }
    if (xmlContent.includes('VEC') || xmlContent.includes('VecContent')) {
        return 'vec';
    }

    return 'unknown';
}

/**
 * Extracts metadata from KBL file data.
 * Only considers the Harness element for company and part information.
 * @param data The parsed KBL data
 * @returns Company name and part name from Harness element
 */
export function extractKblMetadata(data: Record<string, unknown>): FileMetadata {
    let companyName: string | null = null;
    let partName: string | null = null;

    // Extract metadata only from Harness element
    const harness = data['Harness'] as Record<string, unknown> | undefined;
    if (harness) {
        companyName = getNestedValue(harness, 'Company_name');
        partName = getNestedValue(harness, 'Part_number');

        // Fallback to Description if Part_number is not available
        if (!partName) {
            partName = getNestedValue(harness, 'Description');
        }
    }

    return { companyName, partName };
}

/**
 * Extracts metadata from VEC file data
 * @param data The parsed VEC data
 * @returns Company name and part name
 */
export function extractVecMetadata(data: Record<string, unknown>): FileMetadata {
    const companyName = getNestedValue(data, 'DocumentVersion.CompanyName');
    const partName = getNestedValue(data, 'GeneratingSystemName');
    return { companyName, partName };
}

/**
 * Process VEC data to keep only newest DocumentVersion.
 * VEC files may contain multiple document versions, but we only need the latest one.
 * @param data The parsed VEC data
 * @returns Processed VEC data with only the newest DocumentVersion
 */
export function processVecData(data: Record<string, unknown>): Record<string, unknown> {
    function findAndReplaceDocumentVersions(obj: unknown): unknown {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => findAndReplaceDocumentVersions(item));
        }

        const newObj: Record<string, unknown> = {};
        for (const key in obj as Record<string, unknown>) {
            const value = (obj as Record<string, unknown>)[key];
            if (key.includes('DocumentVersion') && Array.isArray(value)) {
                // Keep only the last (newest) DocumentVersion
                newObj[key] = value[value.length - 1];
            } else {
                newObj[key] = findAndReplaceDocumentVersions(value);
            }
        }
        return newObj;
    }

    const processed = findAndReplaceDocumentVersions(data) as Record<string, unknown>;
    return flattenLocalizedStrings(processed) as Record<string, unknown>;
}

/**
 * Checks if an object matches the VEC LocalizedString pattern:
 * has LanguageCode and Value properties, optionally with _xsi:type containing "LocalizedString".
 */
function isVecLocalizedString(obj: Record<string, unknown>): boolean {
    return typeof obj['LanguageCode'] === 'string' && typeof obj['Value'] === 'string';
}

/**
 * Recursively walks the parsed VEC JSON and replaces VEC LocalizedString objects
 * (objects with LanguageCode + Value) with just the Value string.
 * This is a workaround because the AAS Generator does not support object values
 * for fields mapped to AAS string properties.
 */
export function flattenLocalizedStrings(obj: unknown): unknown {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        // Array of LocalizedStrings (multiple languages) — pick the first entry's Value
        if (
            obj.length > 0 &&
            obj.every(
                (item) =>
                    typeof item === 'object' && item !== null && isVecLocalizedString(item as Record<string, unknown>),
            )
        ) {
            return (obj[0] as Record<string, unknown>)['Value'];
        }
        return obj.map((item) => flattenLocalizedStrings(item));
    }

    const record = obj as Record<string, unknown>;

    // If the current node itself is a LocalizedString, flatten it
    if (isVecLocalizedString(record)) {
        return record['Value'];
    }

    const newObj: Record<string, unknown> = {};

    for (const key in record) {
        newObj[key] = flattenLocalizedStrings(record[key]);
    }

    return newObj;
}
