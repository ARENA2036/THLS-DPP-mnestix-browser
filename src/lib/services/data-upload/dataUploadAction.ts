'use server';

import { wrapErrorCode, wrapSuccess } from 'lib/util/apiResponseWrapper/apiResponseWrapper';
import { ApiResultStatus } from 'lib/util/apiResponseWrapper/apiResultStatus';

type WorkflowStepName = 'upload' | 'process' | 'generateAas';
type WorkflowStepStatus = 'processing' | 'completed' | 'failed';

interface WorkflowStep {
	currentStep: {
		name: WorkflowStepName;
		status: WorkflowStepStatus;
		error?: string;
	};
	result?: {
		redirectUrl?: string;
	};
}

function isNamedFile(value: FormDataEntryValue): value is File {
	return typeof value === 'object' && value !== null && 'name' in value;
}

/**
 * Dummy implementation that simulates the upload workflow without backend calls.
 */
export async function processData(formData: FormData) {
	const fileEntry = formData.get('file');
	const userNameEntry = formData.get('userName');
	const organizationEntry = formData.get('organizationName');

	if (!fileEntry) {
		return wrapErrorCode<WorkflowStep[]>(ApiResultStatus.BAD_REQUEST, 'No file provided');
	}

	const fileName = isNamedFile(fileEntry) ? fileEntry.name : 'data.vec';
	const safeName = encodeURIComponent(fileName.replace(/\s+/g, '-'));
	const safeUserName = typeof userNameEntry === 'string' && userNameEntry.trim()
		? encodeURIComponent(userNameEntry.trim().replace(/\s+/g, '-'))
		: 'user';
	const safeOrganizationName = typeof organizationEntry === 'string' && organizationEntry.trim()
		? encodeURIComponent(organizationEntry.trim().replace(/\s+/g, '-'))
		: 'organization';

	const steps: WorkflowStep[] = [
		{ currentStep: { name: 'upload', status: 'processing' } },
		{ currentStep: { name: 'upload', status: 'completed' } },
		{ currentStep: { name: 'process', status: 'processing' } },
		{ currentStep: { name: 'process', status: 'completed' } },
		{ currentStep: { name: 'generateAas', status: 'processing' } },
		{
			currentStep: { name: 'generateAas', status: 'completed' },
			result: { redirectUrl: `/generated-aas/${safeUserName}/${safeOrganizationName}/${safeName}` },
		},
	];

	return wrapSuccess(steps);
}
