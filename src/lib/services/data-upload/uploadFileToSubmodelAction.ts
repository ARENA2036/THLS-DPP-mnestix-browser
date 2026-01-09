import { putAttachmentToSubmodelElement } from 'lib/services/submodel-repository-service/submodelRepositoryActions';
import { RepositoryWithInfrastructure } from '../database/InfrastructureMappedTypes';
import { ApiResultStatus } from 'lib/util/apiResponseWrapper/apiResultStatus';
import { wrapErrorCode, wrapSuccess } from 'lib/util/apiResponseWrapper/apiResponseWrapper';
import { getDefaultInfrastructureName } from '../database/infrastructureDatabaseActions';


export async function uploadFileToSubmodelInDefaultInfrastructure(submodelId: string, idShortPath: string,
    file: File,
    fileName: string, repository: string
) {
    try {
        const infrastructure = await getDefaultInfrastructureName();
        const result = await putAttachmentToSubmodelElement(submodelId, {
            idShortPath,
            file,
            fileName
        }, { url: repository, infrastructureName: infrastructure } as RepositoryWithInfrastructure);
        return wrapSuccess(result);
    } catch (error) {
        console.error('Failed to upload file to submodel:', error);
        return wrapErrorCode(
            ApiResultStatus.UNKNOWN_ERROR,
            'Failed to upload file to submodel',
        );
    }
}