'use server';

import { AssetAdministrationShellRepositoryApi } from 'lib/api/basyx-v3/api';
import { mnestixFetch } from 'lib/api/infrastructure';
import { wrapErrorCode, wrapSuccess } from 'lib/util/apiResponseWrapper/apiResponseWrapper';
import { ApiResultStatus } from 'lib/util/apiResponseWrapper/apiResultStatus';
import { getDefaultInfrastructure } from '../database/infrastructureDatabaseActions';
import { createSecurityHeaders } from 'lib/util/securityHelpers/SecurityConfiguration';

/**
 * Uploads a thumbnail to an Asset Administration Shell
 * @param aasRepositoryUrl The URL of the AAS Repository
 * @param aasId The ID of the AAS to upload the thumbnail to
 * @param formData FormData containing the thumbnail image file
 * @returns ApiResponseWrapper indicating success or failure
 */
export async function uploadThumbnail(aasRepositoryUrl: string, aasId: string, formData: FormData) {
    const fileEntry = formData.get('thumbnail');
    const VALID_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

    if (!fileEntry) {
        return wrapErrorCode(ApiResultStatus.BAD_REQUEST, 'No thumbnail file provided');
    }

    const file = fileEntry as File;
    const fileName = file.name;

    // Validate file type
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
        return wrapErrorCode(
            ApiResultStatus.BAD_REQUEST,
            'pages.uploadData.thumbnail.invalidFileType',
        );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return wrapErrorCode(
            ApiResultStatus.BAD_REQUEST,
            'pages.uploadData.thumbnail.fileTooLarge',
        );
    }

    if (!aasRepositoryUrl) {
        return wrapErrorCode(
            ApiResultStatus.BAD_REQUEST,
            'pages.uploadData.thumbnail.uploadError',
        );
    }

    const defaultInfrastructure = await getDefaultInfrastructure();
    const securityHeaders = await createSecurityHeaders(defaultInfrastructure);
    
    try {
        const aasRepositoryApi = AssetAdministrationShellRepositoryApi.create(
            aasRepositoryUrl,
            mnestixFetch(securityHeaders),
        );
        const blob = new Blob([await file.arrayBuffer()], { type: file.type });

        const response = await aasRepositoryApi.putThumbnailToShell(aasId, blob, fileName);

        if (!response.isSuccess) {
            return wrapErrorCode(
                ApiResultStatus.UNKNOWN_ERROR,
                'pages.uploadData.thumbnail.uploadError',
            );
        }

        return wrapSuccess({ success: true });
    } catch (error) {
        console.error('Failed to upload thumbnail:', error);
        return wrapErrorCode(
            ApiResultStatus.UNKNOWN_ERROR,
            'pages.uploadData.thumbnail.uploadError',
        );
    }
}
