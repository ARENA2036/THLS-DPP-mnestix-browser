'use server';

import { AssetAdministrationShellRepositoryApi } from 'lib/api/basyx-v3/api';
import { mnestixFetch } from 'lib/api/infrastructure';
import { wrapErrorCode, wrapSuccess } from 'lib/util/apiResponseWrapper/apiResponseWrapper';
import { ApiResultStatus } from 'lib/util/apiResponseWrapper/apiResultStatus';
import { getInfrastructureByAasRepositoryUrl } from '../database/infrastructureDatabaseActions';
import { createSecurityHeaders } from 'lib/util/securityHelpers/SecurityConfiguration';
import { createRequestLogger, logInfo, logWarn } from 'lib/util/Logger';
import { headers } from 'next/headers';
import { envs } from 'lib/env/MnestixEnv';

/**
 * Uploads a thumbnail to an Asset Administration Shell
 * PDFs should be converted to images on the client side before calling this action.
 * @param aasRepositoryUrl The URL of the AAS Repository
 * @param aasId The ID of the AAS to upload the thumbnail to
 * @param formData FormData containing the thumbnail image file
 * @returns ApiResponseWrapper indicating success or failure
 */
export async function uploadThumbnail(aasRepositoryUrl: string, aasId: string, formData: FormData) {
    const fileEntry = formData.get('thumbnail');
    // PDFs are converted to PNG on client side, so we accept image types only here
    const VALID_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

    if (!fileEntry) {
        return wrapErrorCode(ApiResultStatus.BAD_REQUEST, 'No thumbnail file provided');
    }

    const file = fileEntry as File;

    // Validate file type
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
        return wrapErrorCode(ApiResultStatus.BAD_REQUEST, 'pages.uploadData.thumbnail.invalidFileType');
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return wrapErrorCode(ApiResultStatus.BAD_REQUEST, 'pages.uploadData.thumbnail.fileTooLarge');
    }

    const fileName = file.name;

    if (!aasRepositoryUrl) {
        return wrapErrorCode(ApiResultStatus.BAD_REQUEST, 'pages.uploadData.thumbnail.uploadError');
    }

    const logger = createRequestLogger(await headers());

    // Get infrastructure based on the repository URL
    const infrastructure = await getInfrastructureByAasRepositoryUrl(aasRepositoryUrl);
    if (!infrastructure) {
        logWarn(logger, 'uploadThumbnail', 'No infrastructure found for AAS repository URL', {
            repository: aasRepositoryUrl,
        });
        return wrapErrorCode(ApiResultStatus.NOT_FOUND, 'pages.uploadData.thumbnail.uploadError');
    }

    const securityHeaders = await createSecurityHeaders(infrastructure);
    // Use OVERRIDE_RC_ATTACHMENT_REPO env override if set for multi-infrastructure setups
    const effectiveRepoUrl = envs.OVERRIDE_RC_ATTACHMENT_REPO || aasRepositoryUrl;

    try {
        const aasRepositoryApi = AssetAdministrationShellRepositoryApi.create(
            effectiveRepoUrl,
            mnestixFetch(securityHeaders),
        );
        const blob = new Blob([await file.arrayBuffer()], { type: file.type });

        const response = await aasRepositoryApi.putThumbnailToShell(aasId, blob, fileName);

        if (!response.isSuccess) {
            return wrapErrorCode(ApiResultStatus.UNKNOWN_ERROR, 'pages.uploadData.thumbnail.uploadError');
        }

        logInfo(logger, 'uploadThumbnail', 'Successfully uploaded thumbnail', {
            aasId,
            fileName,
        });

        return wrapSuccess({ success: true });
    } catch (error) {
        logWarn(logger, 'uploadThumbnail', 'Failed to upload thumbnail', {
            error: error instanceof Error ? error.message : String(error),
        });
        return wrapErrorCode(ApiResultStatus.UNKNOWN_ERROR, 'pages.uploadData.thumbnail.uploadError');
    }
}
