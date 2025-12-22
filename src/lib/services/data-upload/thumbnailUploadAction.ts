'use server';

import { AssetAdministrationShellRepositoryApi } from 'lib/api/basyx-v3/api';
import { mnestixFetch } from 'lib/api/infrastructure';
import { wrapErrorCode, wrapSuccess } from 'lib/util/apiResponseWrapper/apiResponseWrapper';
import { ApiResultStatus } from 'lib/util/apiResponseWrapper/apiResultStatus';
import { getDefaultInfrastructure } from '../database/infrastructureDatabaseActions';
import { createSecurityHeaders } from 'lib/util/securityHelpers/SecurityConfiguration';

/**
 * Uploads a thumbnail to an Asset Administration Shell
 * @param aasId The ID of the AAS to upload the thumbnail to
 * @param formData FormData containing the thumbnail image file
 * @returns ApiResponseWrapper indicating success or failure
 */
export async function uploadThumbnail(aasRepositoryUrl: string, aasId: string, formData: FormData) {
    const fileEntry = formData.get('thumbnail');

    if (!fileEntry) {
        return wrapErrorCode(ApiResultStatus.BAD_REQUEST, 'No thumbnail file provided');
    }

    const file = fileEntry as File;
    const fileName = file.name;

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
        return wrapErrorCode(
            ApiResultStatus.BAD_REQUEST,
            'pages.uploadData.thumbnail.invalidFileType',
        );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        return wrapErrorCode(
            ApiResultStatus.BAD_REQUEST,
            'pages.uploadData.thumbnail.fileTooLarge',
        );
    }
    
    const defaultInfrastructure = await getDefaultInfrastructure();
    const securityHeaders = await createSecurityHeaders(defaultInfrastructure);
    const apiUrl = aasRepositoryUrl;
    if (!apiUrl) {
        return wrapErrorCode(
            ApiResultStatus.BAD_REQUEST,
            'pages.uploadData.thumbnail.uploadError',
        );
    }
    
    try {
        const aasRepositoryApi = AssetAdministrationShellRepositoryApi.create(
            apiUrl,
            mnestixFetch(securityHeaders),
        )        
        
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
