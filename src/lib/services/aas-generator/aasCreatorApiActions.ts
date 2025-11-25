'use server';

import { ApiResponseWrapper, wrapErrorCode, wrapSuccess } from 'lib/util/apiResponseWrapper/apiResponseWrapper';
import { ApiResultStatus } from 'lib/util/apiResponseWrapper/apiResultStatus';
import { CreateAasResponse } from 'lib/api/mnestix-aas-generator/v2/models/index';
import { createVersionedAasGeneratorClients } from './aasGeneratorVersioning';
import { ResponseError } from 'lib/api/mnestix-aas-generator/v2/runtime';

/**
 * Creates a new AAS with optional submodels using the AAS Generator API
 * @param assetIdShort The assetIdShort to be used for creating the AAS
 * @param blueprintsIds Optional array of blueprint IDs for submodel generation
 * @param data Optional data object for populating the submodels
 * @param language Optional language code for the submodels
 * @returns ApiResponseWrapper containing the CreateAasResponse or error
 */
export async function createAasWithSubmodels(
    assetIdShort: string,
    blueprintsIds?: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any,
    language?: string,
): Promise<ApiResponseWrapper<CreateAasResponse>> {
    try {
        const clients = await createVersionedAasGeneratorClients();

        const response = await clients.v2.aasCreatorApi.aasCreatorCreateAas({
            assetIdShort,
            body:
                blueprintsIds || data || language
                    ? {
                          blueprintsIds,
                          data,
                          language,
                      }
                    : undefined,
        });

        return wrapSuccess(response);
    } catch (error) {
        if (error instanceof ResponseError) {
            const errorResponse = await error.response.json();
            const status = error.response.status;

            if (status === 400) {
                return wrapErrorCode(
                    ApiResultStatus.BAD_REQUEST,
                    errorResponse.title || errorResponse.detail || 'Bad request',
                );
            } else if (status === 409) {
                return wrapErrorCode(
                    ApiResultStatus.CONFLICT,
                    errorResponse.title || errorResponse.detail || 'AAS already exists',
                );
            } else if (status >= 500) {
                return wrapErrorCode(
                    ApiResultStatus.UNKNOWN_ERROR,
                    errorResponse.title || errorResponse.detail || 'Server error',
                );
            }

            return wrapErrorCode(
                ApiResultStatus.UNKNOWN_ERROR,
                errorResponse.title || errorResponse.detail || 'An error occurred',
            );
        }

        console.error('Error creating AAS:', error);
        return wrapErrorCode(ApiResultStatus.UNKNOWN_ERROR, 'Failed to create AAS');
    }
}
