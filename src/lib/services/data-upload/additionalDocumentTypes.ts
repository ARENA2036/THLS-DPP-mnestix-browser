/**
 * Types for additional document uploads in the DPP creation workflow
 */

export type AdditionalDocumentUploadStatus = 'pending' | 'uploading' | 'success' | 'error';

/**
 * Represents an additional document to be uploaded to the HandoverDocumentation submodel
 */
export interface AdditionalDocument {
    /** Unique ID for React key and tracking */
    id: string;
    /** The file to upload */
    file: File;
    /** Document title (defaults to filename, user can edit) - maps to DocumentVersion.Title */
    title: string;
    /** Document description - maps to DocumentVersion.SubTitle */
    description: string;
    /** VDI 2770 class ID (e.g., '02-01') - maps to DocumentClassification.ClassId */
    classId: string;
    /** VDI 2770 class name derived from classId - maps to DocumentClassification.ClassName */
    className: string;
    /** Upload status */
    uploadStatus: AdditionalDocumentUploadStatus;
    /** Error message if upload failed */
    errorMessage?: string;
}

/**
 * Payload for uploading an additional document to the server
 */
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
 * Result from the AAS generation step, containing info needed for subsequent uploads
 */
export interface AasGenerationResult {
    /** The generated AAS ID */
    aasId: string;
    /** Base64 encoded AAS ID for URL */
    base64EncodedAasId: string;
    /** URL of the AAS repository */
    aasRepoUrl: string;
    /** ID of the HandoverDocumentation submodel */
    handoverDocSubmodelId: string;
    /** Organization name extracted from VEC/KBL */
    organizationName: string;
    /** Number of existing Document elements in HandoverDocumentation (starts at 1 for VEC/KBL) */
    existingDocumentCount: number;
    /** Redirect URL to view the AAS */
    redirectUrl: string;
    /** Any warnings from generation */
    warnings?: string[];
}

/**
 * State for the upload workflow stepper
 */
export interface UploadWorkflowState {
    /** Current active step index */
    activeStep: number;
    /** Selected VEC/KBL file */
    vecKblFile: File | null;
    /** Result from AAS generation */
    aasResult: AasGenerationResult | null;
    /** Whether thumbnail has been uploaded */
    thumbnailUploaded: boolean;
    /** List of additional documents to upload */
    additionalDocuments: AdditionalDocument[];
    /** Current document index for naming (Document01, Document02, etc.) */
    nextDocumentIndex: number;
    /** Error message for the current step */
    stepError: string | null;
}

/**
 * Workflow step identifiers
 */
export type WorkflowStepId = 'vecKbl' | 'processing' | 'thumbnail' | 'additionalDocs' | 'complete';

/**
 * Workflow step definition
 */
export interface WorkflowStepDefinition {
    id: WorkflowStepId;
    labelKey: string;
}

/**
 * All workflow steps in order
 */
export const WORKFLOW_STEPS: WorkflowStepDefinition[] = [
    { id: 'vecKbl', labelKey: 'stepper.vecKbl' },
    { id: 'processing', labelKey: 'stepper.processing' },
    { id: 'thumbnail', labelKey: 'stepper.thumbnail' },
    { id: 'additionalDocs', labelKey: 'stepper.additionalDocs' },
    { id: 'complete', labelKey: 'stepper.complete' },
];
