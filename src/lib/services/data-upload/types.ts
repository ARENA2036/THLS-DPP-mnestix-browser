export type WorkflowStepName = 'upload' | 'process' | 'generateAas';
export type WorkflowStepStatus = 'processing' | 'completed' | 'failed';
export type FileType = 'vec' | 'kbl' | 'unknown';

export interface WorkflowStep {
    currentStep: {
        name: WorkflowStepName;
        status: WorkflowStepStatus;
        error?: string;
        errorDetail?: string;
    };
    result?: {
        redirectUrl?: string;
        warnings?: string[];
        aasId?: string;
        aasRepoUrl?: string;
    };
}

export interface ParsedFileData {
    type: FileType;
    data: Record<string, unknown>;
    companyName: string | null;
    partName: string | null;
}

export interface FileMetadata {
    companyName: string | null;
    partName: string | null;
}
