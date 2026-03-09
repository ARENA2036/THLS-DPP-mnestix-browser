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
        let obj: Record<string, unknown> | string = {};

        // Handle attributes — flatten into obj with `_` prefix
        if (node.attributes && node.attributes.length > 0) {
            for (let i = 0; i < node.attributes.length; i++) {
                const attr = node.attributes[i];
                (obj as Record<string, unknown>)[`_${attr.nodeName}`] = attr.nodeValue || '';
            }
        }

        // Handle child nodes
        if (node.hasChildNodes()) {
            const children = Array.from(node.childNodes);
            for (const child of children) {
                const childNode = child as Element;
                if (childNode.nodeType === 1) {
                    // Element node
                    const nodeName = childNode.nodeName;
                    const value = xmlToJson(childNode);

                    const record = obj as Record<string, unknown>;
                    if (record[nodeName]) {
                        // If property already exists, make it an array
                        if (Array.isArray(record[nodeName])) {
                            (record[nodeName] as unknown[]).push(value);
                        } else {
                            record[nodeName] = [record[nodeName], value];
                        }
                    } else {
                        record[nodeName] = value;
                    }
                } else if (childNode.nodeType === 3) {
                    // Text node
                    const text = childNode.nodeValue?.trim();
                    if (text) {
                        obj = text;
                    }
                }
            }
        }

        return obj;
    }

    return xmlToJson(xmlDoc.documentElement) as Record<string, unknown>;
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

    return findAndReplaceDocumentVersions(data) as Record<string, unknown>;
}
