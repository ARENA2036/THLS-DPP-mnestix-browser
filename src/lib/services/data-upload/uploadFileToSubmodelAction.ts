import { putAttachmentToSubmodelElement } from 'lib/services/submodel-repository-service/submodelRepositoryActions';
import { RepositoryWithInfrastructure } from '../database/InfrastructureMappedTypes';
import { ApiResultStatus } from 'lib/util/apiResponseWrapper/apiResultStatus';
import { wrapErrorCode, wrapSuccess } from 'lib/util/apiResponseWrapper/apiResponseWrapper';
import { getInfrastructureBySubmodelRepositoryUrl } from '../database/infrastructureDatabaseActions';
import { createRequestLogger, logInfo } from 'lib/util/Logger';
import { headers } from 'next/headers';
import { envs } from 'lib/env/MnestixEnv';

export async function uploadFileToSubmodel(
    submodelId: string,
    idShortPath: string,
    file: File,
    fileName: string,
    repositoryUrl: string,
) {
    const logger = createRequestLogger(await headers());
    try {
        const infrastructure = await getInfrastructureBySubmodelRepositoryUrl(repositoryUrl);
        if (!infrastructure) {
            logInfo(logger, 'uploadFileToSubmodel', 'No infrastructure found for repository URL', {
                repository: repositoryUrl,
            });
            return wrapErrorCode(ApiResultStatus.NOT_FOUND, 'pages.uploadData.handoverDocs.infrastructureNotFound');
        }

        const result = await putAttachmentToSubmodelElement(
            submodelId,
            {
                idShortPath,
                file,
                fileName,
            },
            {
                url: envs.HANDOVER_DOCUMENTATION_FILES_REPO || repositoryUrl,
                infrastructureName: infrastructure.name,
            } as RepositoryWithInfrastructure,
        );
        return wrapSuccess(result);
    } catch (error) {
        logInfo(logger, 'uploadFileToSubmodel', 'Upload file to submodel failed', { error });
        return wrapErrorCode(ApiResultStatus.UNKNOWN_ERROR, 'pages.uploadData.handoverDocs.uploadError');
    }
}
