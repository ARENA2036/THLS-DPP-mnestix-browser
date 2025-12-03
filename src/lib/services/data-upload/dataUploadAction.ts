'use server';

import { wrapErrorCode, wrapSuccess } from 'lib/util/apiResponseWrapper/apiResponseWrapper';
import { ApiResultStatus } from 'lib/util/apiResponseWrapper/apiResultStatus';
import { createAasWithSubmodels } from 'lib/services/aas-generator/aasCreatorApiActions';
import { envs } from 'lib/env/MnestixEnv';
import { DOMParser } from 'xmldom';

type WorkflowStepName = 'upload' | 'process' | 'generateAas';
type WorkflowStepStatus = 'processing' | 'completed' | 'failed';

interface WorkflowStep {
    currentStep: {
        name: WorkflowStepName;
        status: WorkflowStepStatus;
        error?: string;
        errorDetail?: string;
    };
    result?: {
        redirectUrl?: string;
    };
}

/**
 * Parses VEC XML content to JSON
 * @param xmlContent The XML string to parse
 * @returns Parsed JSON object
 */
function parseVecXmlToJson(xmlContent: string): Record<string, unknown> {
    // Using DOMParser from xmldom package
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    // Convert XML to JSON recursively
    function xmlToJson(node: Element): unknown {
        const obj: Record<string, unknown> = {};

        // Handle attributes
        if (node.attributes && node.attributes.length > 0) {
            const attributes: Record<string, string> = {};
            for (let i = 0; i < node.attributes.length; i++) {
                const attr = node.attributes[i];
                attributes[attr.nodeName] = attr.nodeValue || '';
            }
            obj['@attributes'] = attributes;
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
                        obj['#text'] = text;
                    }
                }
            }
        }

        return obj;
    }

    return xmlToJson(xmlDoc.documentElement) as Record<string, unknown>;
}

/**
 * Gets blueprint IDs from environment variable
 * @returns Array of blueprint IDs or undefined
 */
function getBlueprintIds(): string[] | undefined {
    const blueprintsEnv = envs.FILE_UPLOAD_BLUEPRINTS;
    if (!blueprintsEnv) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(blueprintsEnv);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
            return parsed;
        }
    } catch (error) {
        console.error('Failed to parse FILE_UPLOAD_BLUEPRINTS:', error);
    }

    return undefined;
}

/**
 * Helper function to safely get nested values from the parsed VEC data
 */ 
function getNestedValue(obj: unknown, path: string): string | null {
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
 * Processes VEC file upload and creates an AAS with the data.
 *
 * Workflow steps:
 * 1. Upload - validates and receives the file
 * 2. Process - processes the VEC file data (currently simulated)
 * 3. Generate AAS - creates the AAS using the AAS Generator API
 */
export async function processData(formData: FormData) {
    const fileEntry = formData.get('file');

    if (!fileEntry) {
        return wrapErrorCode<WorkflowStep[]>(ApiResultStatus.BAD_REQUEST, 'No file provided');
    }

    const steps: WorkflowStep[] = [];

    // Step 1: Upload
    steps.push({ currentStep: { name: 'upload', status: 'processing' } });

    // Simulate file upload
    await new Promise((resolve) => setTimeout(resolve, 500));

    steps.push({ currentStep: { name: 'upload', status: 'completed' } });

    // Step 2: Process VEC file
    steps.push({ currentStep: { name: 'process', status: 'processing' } });

    // Read and parse the VEC file
    let vecData: Record<string, unknown>;
    try {
        const fileContent = await (fileEntry as File).text();
        vecData = parseVecXmlToJson(fileContent);

        // Keep only the newest (last) DocumentVersion
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

        vecData = findAndReplaceDocumentVersions(vecData) as Record<string, unknown>;



        // Extract organization and part name from VEC data
        const companyName = getNestedValue(vecData, 'DocumentVersion.CompanyName.#text');
        const partName = getNestedValue(vecData, 'GeneratingSystemName.#text');

        // Validate required fields
        const missingFields: string[] = [];
        if (!companyName) missingFields.push('DocumentVersion.CompanyName');
        if (!partName) missingFields.push('GeneratingSystemName');

        if (missingFields.length > 0) {
            steps.push({
                currentStep: {
                    name: 'process',
                    status: 'failed',
                    error: 'pages.uploadData.missingFieldsError',
                    errorDetail: `pages.uploadData.missingFieldsDetail|{"fields":"${missingFields.join(', ')}"}`,
                },
            });
            return wrapSuccess(steps);
        }
    } catch (error) {
        console.error('Failed to parse VEC file:', error);
        steps.push({
            currentStep: {
                name: 'process',
                status: 'failed',
                error: 'Failed to parse VEC file. Please ensure it is a valid XML file.',
            },
        });
        return wrapSuccess(steps);
    }

    steps.push({ currentStep: { name: 'process', status: 'completed' } });

    // Step 3: Generate AAS
    steps.push({ currentStep: { name: 'generateAas', status: 'processing' } });

    const companyName = getNestedValue(vecData, 'DocumentVersion.CompanyName.#text') || 'Unknown';
    const partName = getNestedValue(vecData, 'GeneratingSystemName.#text') || 'Unknown';
    const timestamp = Date.now();

    // Create assetIdShort: Organization-PartName-Timestamp
    const assetIdShort = `${companyName}-${partName}-${timestamp}`.replace(/[^a-zA-Z0-9-_]/g, '-');

    // Get blueprint IDs from environment
    const blueprintIds = getBlueprintIds();

    // Call the AAS Creator API
    const aasCreationResult = await createAasWithSubmodels(
        assetIdShort,
        blueprintIds,
        vecData,
        'en', // TODO: get from user preference
    );

    if (!aasCreationResult.isSuccess) {
        steps.push({
            currentStep: {
                name: 'generateAas',
                status: 'failed',
                error: aasCreationResult.message || 'Failed to create AAS',
                errorDetail: aasCreationResult.errorDetail,
            },
        });
        return wrapSuccess(steps);
    }

    const response = aasCreationResult.result;

    // Generate redirect URL using the base64 encoded AAS ID
    const redirectUrl = response.base64EncodedAasId
        ? `/viewer/${response.base64EncodedAasId}`
        : `/viewer/${encodeURIComponent(response.aasId || '')}`;

    steps.push({
        currentStep: { name: 'generateAas', status: 'completed' },
        result: { redirectUrl },
    });

    return wrapSuccess(steps);
}
