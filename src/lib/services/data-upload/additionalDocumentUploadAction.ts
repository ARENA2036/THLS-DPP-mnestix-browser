'use server';

import { ApiResponseWrapper, wrapErrorCode, wrapSuccess } from 'lib/util/apiResponseWrapper/apiResponseWrapper';
import { ApiResultStatus } from 'lib/util/apiResponseWrapper/apiResultStatus';
import { SubmodelRepositoryApi } from 'lib/api/basyx-v3/api';
import { mnestixFetch } from 'lib/api/infrastructure';
import { getInfrastructureBySubmodelRepositoryUrl } from '../database/infrastructureDatabaseActions';
import { createSecurityHeaders } from 'lib/util/securityHelpers/SecurityConfiguration';
import { createRequestLogger, logInfo, logWarn } from 'lib/util/Logger';
import { headers } from 'next/headers';
import { envs } from 'lib/env/MnestixEnv';
import { VDI2770_CLASSIFICATION_SYSTEM } from './vdi2770Constants';

export interface AdditionalDocumentUploadPayload {
    /** The file to upload */
    file: File;
    /** Document title - maps to DocumentVersion.Title */
    title: string;
    /** Document description - maps to DocumentVersion.SubTitle */
    description: string;
    /** VDI 2770 class ID */
    classId: string;
    /** VDI 2770 class name (localized) */
    className: string;
    /** Organization name from VEC/KBL file - maps to DocumentVersion.OrganizationShortName */
    organizationName: string;
}

/**
 * Creates a Document SubmodelElementCollection structure according to VDI 2770 / IDTA 02004-1-2
 */
function createDocumentSubmodelElementCollection(
    documentIndex: number,
    payload: AdditionalDocumentUploadPayload,
    language: string = 'en',
): object {
    const idShort = `Document${String(documentIndex).padStart(2, '0')}`;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    return {
        modelType: 'SubmodelElementCollection',
        semanticId: {
            keys: [
                {
                    type: 'GlobalReference',
                    value: 'https://admin-shell.io/vdi/2770/1/0/Document',
                },
            ],
            type: 'ExternalReference',
        },
        idShort,
        value: [
            // DocumentId
            {
                modelType: 'SubmodelElementCollection',
                semanticId: {
                    keys: [
                        {
                            type: 'GlobalReference',
                            value: 'https://admin-shell.io/vdi/2770/1/0/DocumentId',
                        },
                    ],
                    type: 'ExternalReference',
                },
                idShort: 'DocumentId',
                value: [
                    {
                        modelType: 'Property',
                        semanticId: {
                            keys: [
                                {
                                    type: 'GlobalReference',
                                    value: 'https://admin-shell.io/vdi/2770/1/0/DocumentId/IsPrimary',
                                },
                            ],
                            type: 'ExternalReference',
                        },
                        idShort: 'IsPrimary',
                        valueType: 'xs:boolean',
                        value: '',
                    },
                    {
                        modelType: 'Property',
                        semanticId: {
                            keys: [
                                {
                                    type: 'GlobalReference',
                                    value: 'https://admin-shell.io/vdi/2770/1/0/DocumentId/DocumentDomainId',
                                },
                            ],
                            type: 'ExternalReference',
                        },
                        idShort: 'DocumentDomainId',
                        valueType: 'xs:string',
                        value: payload.organizationName,
                    },
                ],
            },
            // DocumentClassification
            {
                modelType: 'SubmodelElementCollection',
                semanticId: {
                    keys: [
                        {
                            type: 'GlobalReference',
                            value: 'https://admin-shell.io/vdi/2770/1/0/DocumentClassification',
                        },
                    ],
                    type: 'ExternalReference',
                },
                idShort: 'DocumentClassification',
                value: [
                    {
                        modelType: 'Property',
                        semanticId: {
                            keys: [
                                {
                                    type: 'GlobalReference',
                                    value: '0173-1#02-AAR710#001',
                                },
                            ],
                            type: 'ExternalReference',
                        },
                        idShort: 'ClassificationSystem',
                        valueType: 'xs:string',
                        value: VDI2770_CLASSIFICATION_SYSTEM,
                    },
                    {
                        modelType: 'MultiLanguageProperty',
                        semanticId: {
                            keys: [
                                {
                                    type: 'GlobalReference',
                                    value: '0173-1#02-AAO102#003',
                                },
                            ],
                            type: 'ExternalReference',
                        },
                        idShort: 'ClassName',
                        value: [
                            {
                                language: language,
                                text: payload.className,
                            },
                        ],
                    },
                    {
                        modelType: 'Property',
                        semanticId: {
                            keys: [
                                {
                                    type: 'GlobalReference',
                                    value: 'https://admin-shell.io/vdi/2770/1/0/DocumentClassification/ClassId',
                                },
                            ],
                            type: 'ExternalReference',
                        },
                        idShort: 'ClassId',
                        valueType: 'xs:string',
                        value: payload.classId,
                    },
                ],
            },
            // DocumentVersion
            {
                modelType: 'SubmodelElementCollection',
                semanticId: {
                    keys: [
                        {
                            type: 'GlobalReference',
                            value: 'https://admin-shell.io/vdi/2770/1/0/DocumentVersion',
                        },
                    ],
                    type: 'ExternalReference',
                },
                idShort: 'DocumentVersion',
                value: [
                    {
                        modelType: 'Property',
                        semanticId: {
                            keys: [
                                {
                                    type: 'GlobalReference',
                                    value: 'https://admin-shell.io/vdi/2770/1/0/Organization/OrganizationName',
                                },
                            ],
                            type: 'ExternalReference',
                        },
                        idShort: 'OrganizationName',
                        valueType: 'xs:string',
                        value: payload.organizationName,
                    },
                    {
                        modelType: 'Property',
                        semanticId: {
                            keys: [
                                {
                                    type: 'GlobalReference',
                                    value: 'https://admin-shell.io/vdi/2770/1/0/LifeCycleStatus/StatusSetDate',
                                },
                            ],
                            type: 'ExternalReference',
                        },
                        idShort: 'StatusSetDate',
                        valueType: 'xs:date',
                        value: today,
                    },
                    {
                        modelType: 'MultiLanguageProperty',
                        semanticId: {
                            keys: [
                                {
                                    type: 'GlobalReference',
                                    value: 'https://admin-shell.io/vdi/2770/1/0/DocumentDescription/Title',
                                },
                            ],
                            type: 'ExternalReference',
                        },
                        idShort: 'Title',
                        value: [
                            {
                                language: language,
                                text: payload.title,
                            },
                        ],
                    },
                    {
                        modelType: 'MultiLanguageProperty',
                        semanticId: {
                            keys: [
                                {
                                    type: 'GlobalReference',
                                    value: 'https://admin-shell.io/vdi/2770/1/0/DocumentDescription/SubTitle',
                                },
                            ],
                            type: 'ExternalReference',
                        },
                        idShort: 'SubTitle',
                        value: [
                            {
                                language: language,
                                text: payload.description,
                            },
                        ],
                    },
                    {
                        modelType: 'File',
                        semanticId: {
                            keys: [
                                {
                                    type: 'GlobalReference',
                                    value: 'https://admin-shell.io/vdi/2770/1/0/StoredDocumentRepresentation/DigitalFile',
                                },
                            ],
                            type: 'ExternalReference',
                        },
                        idShort: 'DigitalFile',
                        contentType: payload.file.type || 'application/octet-stream',
                        value: '', // Will be populated when file is uploaded
                    },
                ],
            },
        ],
    };
}

/**
 * Uploads an additional document to the HandoverDocumentation submodel.
 * Creates a new Document SubmodelElementCollection and uploads the file to it.
 *
 * @param submodelId The ID of the HandoverDocumentation submodel
 * @param repositoryUrl The URL of the submodel repository
 * @param payload The document metadata and file
 * @param documentIndex The index for naming (Document01, Document02, etc.)
 * @param language The language code for multilanguage properties
 * @returns ApiResponseWrapper indicating success or failure
 */
export async function uploadAdditionalDocument(
    submodelId: string,
    repositoryUrl: string,
    payload: AdditionalDocumentUploadPayload,
    documentIndex: number,
    language: string = 'en',
): Promise<ApiResponseWrapper<{ success: boolean; documentIdShort: string }>> {
    const logger = createRequestLogger(await headers());

    try {
        // Get infrastructure for authentication
        const infrastructure = await getInfrastructureBySubmodelRepositoryUrl(repositoryUrl);
        if (!infrastructure) {
            logWarn(logger, 'uploadAdditionalDocument', 'No infrastructure found for repository URL', {
                repository: repositoryUrl,
            });
            return wrapErrorCode(ApiResultStatus.NOT_FOUND, 'pages.uploadData.handoverDocs.infrastructureNotFound');
        }

        const securityHeaders = await createSecurityHeaders(infrastructure);
        const effectiveRepoUrl = envs.OVERRIDE_RC_ATTACHMENT_REPO || repositoryUrl;
        const submodelApi = SubmodelRepositoryApi.create(effectiveRepoUrl, mnestixFetch(securityHeaders));

        // Create the Document SubmodelElementCollection
        const documentSmc = createDocumentSubmodelElementCollection(documentIndex, payload, language);
        const documentIdShort = `Document${String(documentIndex).padStart(2, '0')}`;

        logInfo(logger, 'uploadAdditionalDocument', 'Creating Document SubmodelElementCollection', {
            submodelId,
            documentIdShort,
            fileName: payload.file.name,
        });

        // Post the Document SMC to the submodel
        const postResult = await submodelApi.postSubmodelElement(submodelId, documentSmc);

        if (!postResult.isSuccess) {
            logWarn(logger, 'uploadAdditionalDocument', 'Failed to create Document SMC', {
                error: postResult.message,
            });
            return wrapErrorCode(postResult.errorCode, 'pages.uploadData.additionalDocs.uploadError');
        }

        // Upload the file to the DigitalFile element
        const idShortPath = `${documentIdShort}.DocumentVersion.DigitalFile`;

        logInfo(logger, 'uploadAdditionalDocument', 'Uploading file to Document', {
            submodelId,
            idShortPath,
            fileName: payload.file.name,
        });

        const uploadResult = await submodelApi.putAttachmentToSubmodelElement(submodelId, {
            idShortPath,
            file: payload.file,
            fileName: payload.file.name,
        });

        if (!uploadResult.isSuccess) {
            logWarn(logger, 'uploadAdditionalDocument', 'Failed to upload file', {
                error: uploadResult.message,
            });
            return wrapErrorCode(uploadResult.errorCode, 'pages.uploadData.additionalDocs.uploadError');
        }

        logInfo(logger, 'uploadAdditionalDocument', 'Successfully uploaded additional document', {
            documentIdShort,
            fileName: payload.file.name,
        });

        return wrapSuccess({ success: true, documentIdShort });
    } catch (error) {
        logWarn(logger, 'uploadAdditionalDocument', 'Unexpected error uploading additional document', {
            error: error instanceof Error ? error.message : String(error),
        });
        return wrapErrorCode(ApiResultStatus.UNKNOWN_ERROR, 'pages.uploadData.additionalDocs.uploadError');
    }
}

/**
 * Uploads multiple additional documents to the HandoverDocumentation submodel.
 *
 * @param submodelId The ID of the HandoverDocumentation submodel
 * @param repositoryUrl The URL of the submodel repository
 * @param documents Array of document payloads with FormData
 * @param startIndex Starting index for document naming
 * @param language The language code for multilanguage properties
 * @returns ApiResponseWrapper with results for each document
 */
export async function uploadAdditionalDocuments(
    submodelId: string,
    repositoryUrl: string,
    formData: FormData,
    startIndex: number,
    language: string = 'en',
): Promise<ApiResponseWrapper<{ results: Array<{ fileName: string; success: boolean; error?: string }> }>> {
    const logger = createRequestLogger(await headers());
    const results: Array<{ fileName: string; success: boolean; error?: string }> = [];

    // Extract documents from FormData
    // Expected format: files[], titles[], descriptions[], classIds[], classNames[], organizationName
    const files = formData.getAll('files') as File[];
    const titles = formData.getAll('titles') as string[];
    const descriptions = formData.getAll('descriptions') as string[];
    const classIds = formData.getAll('classIds') as string[];
    const classNames = formData.getAll('classNames') as string[];
    const organizationName = formData.get('organizationName') as string;

    if (files.length === 0) {
        return wrapErrorCode(ApiResultStatus.BAD_REQUEST, 'No files provided');
    }

    logInfo(logger, 'uploadAdditionalDocuments', 'Starting batch upload', {
        fileCount: files.length,
        startIndex,
    });

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const payload: AdditionalDocumentUploadPayload = {
            file,
            title: titles[i] || file.name,
            description: descriptions[i] || '',
            classId: classIds[i] || '02-01',
            className: classNames[i] || 'Technical specification',
            organizationName: organizationName || 'Unknown',
        };

        const result = await uploadAdditionalDocument(submodelId, repositoryUrl, payload, startIndex + i, language);

        results.push({
            fileName: file.name,
            success: result.isSuccess,
            error: result.isSuccess ? undefined : result.message,
        });
    }

    const allSuccessful = results.every((r) => r.success);
    if (!allSuccessful) {
        logInfo(logger, 'uploadAdditionalDocuments', 'Batch upload completed with errors', {
            results,
        });
    }

    return wrapSuccess({ results });
}
