'use server';

import { wrapErrorCode, wrapSuccess } from 'lib/util/apiResponseWrapper/apiResponseWrapper';
import { ApiResultStatus } from 'lib/util/apiResponseWrapper/apiResultStatus';
import { createAasWithSubmodels } from 'lib/services/aas-generator/aasCreatorApiActions';
import { uploadFileToSubmodel } from './uploadFileToSubmodelAction';
import { envs } from 'lib/env/MnestixEnv';
import {
    parseXmlToJson,
    detectFileType,
    extractKblMetadata,
    extractVecMetadata,
    processVecData,
} from './fileHelper';
import { WorkflowStep, ParsedFileData } from './types';

/**
 * Gets blueprint IDs from environment variable based on file type
 * @param fileType The type of file ('kbl' or 'vec')
 * @returns Array of blueprint IDs or undefined if not configured
 */
function getBlueprintIds(fileType: 'kbl' | 'vec'): string[] | undefined {
    const blueprintsEnv =
        fileType === 'kbl' ? envs.FILE_UPLOAD_BLUEPRINTS_KBL : envs.FILE_UPLOAD_BLUEPRINTS_VEC;
    if (!blueprintsEnv) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(blueprintsEnv);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
            return parsed;
        }
    } catch (error) {
        console.error(`Failed to parse FILE_UPLOAD_BLUEPRINTS_${fileType.toUpperCase()}:`, error);
    }

    return undefined;
}

/**
 * Parses and processes the uploaded file content
 * @param fileContent The file content as string
 * @param fileName The file name
 * @returns Parsed file data with metadata
 * @throws Error if file parsing fails
 */
function parseFileContent(fileContent: string, fileName: string): ParsedFileData {
    const fileType = detectFileType(fileContent, fileName);
    let data = parseXmlToJson(fileContent);

    // For VEC files, keep only the newest DocumentVersion
    if (fileType === 'vec') {
        data = processVecData(data);
    }

    // Extract metadata based on file type
    let companyName: string | null = null;
    let partName: string | null = null;

    if (fileType === 'kbl') {
        const metadata = extractKblMetadata(data);
        companyName = metadata.companyName;
        partName = metadata.partName;
    } else if (fileType === 'vec') {
        const metadata = extractVecMetadata(data);
        companyName = metadata.companyName;
        partName = metadata.partName;
    }

    return { type: fileType, data, companyName, partName };
}

/**
 * Validates the parsed file data for required fields
 * @param parsedFile The parsed file data
 * @returns Array of missing field names, empty if all required fields are present
 */
function validateParsedFile(parsedFile: ParsedFileData): string[] {
    const missingFields: string[] = [];

    if (!parsedFile.companyName) {
        missingFields.push('CompanyName');
    }
    if (!parsedFile.partName) {
        missingFields.push('PartName');
    }

    return missingFields;
}

/**
 * Generates an asset ID short name from company, part, and timestamp
 * @param companyName The company name
 * @param partName The part name
 * @param timestamp The timestamp
 * @returns Sanitized asset ID short name
 */
function generateAssetIdShort(companyName: string, partName: string, timestamp: number): string {
    return `${companyName}-${partName}-${timestamp}`.replace(/[^a-zA-Z0-9-_]/g, '-');
}

/**
 * Processes uploaded file (VEC or KBL) and creates an AAS with the data.
 *
 * Workflow steps:
 * 1. Upload - validates and receives the file
 * 2. Process - parses and validates the file data
 * 3. Generate AAS - creates the AAS using the AAS Generator API and uploads the file to the submodel
 *
 * @param formData FormData containing the file to process
 * @returns Array of workflow steps with their status and results
 */
export async function processData(formData: FormData) {
    const fileEntry = formData.get('file');

    if (!fileEntry) {
        return wrapErrorCode<WorkflowStep[]>(ApiResultStatus.BAD_REQUEST, 'No file provided');
    }

    const file = fileEntry as File;
    const fileName = file.name;
    const steps: WorkflowStep[] = [];

    // Step 1: Upload
    steps.push({ currentStep: { name: 'upload', status: 'processing' } });
    await new Promise((resolve) => setTimeout(resolve, 500));
    steps.push({ currentStep: { name: 'upload', status: 'completed' } });

    // Step 2: Process file
    steps.push({ currentStep: { name: 'process', status: 'processing' } });

    let parsedFile: ParsedFileData;
    try {
        const fileContent = await file.text();
        parsedFile = parseFileContent(fileContent, fileName);

        // Check if file type is supported
        if (parsedFile.type === 'unknown') {
            steps.push({
                currentStep: {
                    name: 'process',
                    status: 'failed',
                    error: 'pages.uploadData.apiErrors.unsupportedFileType',
                    errorDetail: 'pages.uploadData.apiErrors.unsupportedFileTypeDetail',
                },
            });
            return wrapSuccess(steps);
        }

        // Validate required fields
        const missingFields = validateParsedFile(parsedFile);
        if (missingFields.length > 0) {
            steps.push({
                currentStep: {
                    name: 'process',
                    status: 'failed',
                    error: 'pages.uploadData.apiErrors.missingFieldsError',
                    errorDetail: `pages.uploadData.apiErrors.missingFieldsDetail|{"fields":"${missingFields.join(', ')}"}`,
                },
            });
            return wrapSuccess(steps);
        }
    } catch (error) {
        console.error('Failed to parse file:', error);
        steps.push({
            currentStep: {
                name: 'process',
                status: 'failed',
                error: 'pages.uploadData.apiErrors.parseError',
            },
        });
        return wrapSuccess(steps);
    }

    steps.push({ currentStep: { name: 'process', status: 'completed' } });

    // Step 3: Generate AAS
    steps.push({ currentStep: { name: 'generateAas', status: 'processing' } });

    const companyName = parsedFile.companyName || 'Unknown';
    const partName = parsedFile.partName || 'Unknown';
    const timestamp = Date.now();
    const assetIdShort = generateAssetIdShort(companyName, partName, timestamp);
    const blueprintIds = getBlueprintIds(parsedFile.type);

    // Call the AAS Creator API
    const aasCreationResult = await createAasWithSubmodels(
        assetIdShort,
        blueprintIds,
        parsedFile.data,
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
    const redirectUrl = response.base64EncodedAasId
        ? `/viewer/${response.base64EncodedAasId}`
        : `/viewer/${encodeURIComponent(response.aasId || '')}`;

    // Extract warnings from all submodel results
    const warnings: string[] = [];
    if (response.submodelResults) {
        for (const submodelResult of response.submodelResults) {
            const logs = submodelResult.debugInfo?.logs || [];
            const warningLogs = logs.filter((log) => log.startsWith('WARNING'));
            warnings.push(...warningLogs);
        }
    }

    // Upload file to submodel as part of the generation step
    // For now, we assume the submodel for file upload is identified by blueprint ID starting with 'Handover'.
    const submodelId = response.submodelResults?.find(sm => sm.blueprintId?.startsWith('Handover'))?.generatedSubmodelId;

    const submodelElementIdShort = `Document.DocumentVersion.DigitalFile`;

    if (response.aasId && submodelId && response.aasRepoUrl) {
        const uploadResult = await uploadFileToSubmodel(
            submodelId,
            submodelElementIdShort,
            file,
            fileName,
            response.aasRepoUrl,
        );

        if (!uploadResult.isSuccess) {
            steps.push({
                currentStep: {
                    name: 'generateAas',
                    status: 'failed',
                    error: uploadResult.message || 'Failed to upload file to submodel',
                    errorDetail: uploadResult.errorDetail,
                },
            });
            return wrapErrorCode(uploadResult.errorCode, 'Failed to upload file to submodel');
        }
    } else {
        // Skip file upload if submodel path is not configured
        console.warn('Submodel path not configured, skipping file upload');
    }

    steps.push({
        currentStep: { name: 'generateAas', status: 'completed' },
        result: {
            redirectUrl,
            warnings: warnings.length > 0 ? warnings : undefined,
            aasId: response.aasId,
            aasRepoUrl: response.aasRepoUrl,
        },
    });

    return wrapSuccess(steps);
}
