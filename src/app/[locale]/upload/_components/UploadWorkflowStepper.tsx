'use client';

import { useState, useRef, useTransition } from 'react';
import { Box, Step, StepContent, StepLabel, Stepper, Typography, Button } from '@mui/material';
import { useTranslations } from 'next-intl';
import { processData } from 'lib/services/data-upload/dataUploadAction';
import { WORKFLOW_STEPS } from 'lib/services/data-upload/additionalDocumentTypes';
import StepVecKblUpload from './StepVecKblUpload';
import StepProcessing from './StepProcessing';
import StepThumbnail from './StepThumbnail';
import StepAdditionalDocuments from './StepAdditionalDocuments';
import StepComplete from './StepComplete';

type StepStatus = 'idle' | 'processing' | 'success' | 'error';

interface WorkflowState {
    /** Current active step (0-4) */
    activeStep: number;
    /** Selected VEC/KBL file */
    vecKblFile: File | null;
    /** Upload step status */
    uploadStatus: StepStatus;
    /** Processing step status */
    processingStatus: StepStatus;
    /** Generate AAS step status */
    generateAasStatus: StepStatus;
    /** AAS ID after generation */
    aasId: string | null;
    /** Base64 encoded AAS ID */
    base64EncodedAasId: string | null;
    /** AAS repository URL */
    aasRepoUrl: string | null;
    /** HandoverDocumentation submodel ID */
    handoverDocSubmodelId: string | null;
    /** Organization name from VEC/KBL */
    organizationName: string | null;
    /** Redirect URL to view AAS */
    redirectUrl: string | null;
    /** Whether thumbnail has been uploaded */
    thumbnailUploaded: boolean;
    /** Error message */
    errorMessage: string | null;
    /** Error detail */
    errorDetail: string | null;
    /** Warnings from processing */
    warnings: string[];
    /** Detailed debug info from backend */
    rawDebugInfo: string[];
}

const initialState: WorkflowState = {
    activeStep: 0,
    vecKblFile: null,
    uploadStatus: 'idle',
    processingStatus: 'idle',
    generateAasStatus: 'idle',
    aasId: null,
    base64EncodedAasId: null,
    aasRepoUrl: null,
    handoverDocSubmodelId: null,
    organizationName: null,
    redirectUrl: null,
    thumbnailUploaded: false,
    errorMessage: null,
    errorDetail: null,
    warnings: [],
    rawDebugInfo: [],
};

/**
 * Main workflow stepper for DPP creation.
 * Orchestrates the 5-step process:
 * 1. Upload VEC/KBL file
 * 2. Process and generate AAS
 * 3. Upload thumbnail (required)
 * 4. Upload additional documents (optional)
 * 5. Complete
 */
export default function UploadWorkflowStepper() {
    const [state, setState] = useState<WorkflowState>(initialState);
    const [isPending, startTransition] = useTransition();
    const requestIdRef = useRef(0);
    const t = useTranslations('pages.uploadData');

    function updateState(updates: Partial<WorkflowState>) {
        setState((prev) => ({ ...prev, ...updates }));
    }

    function translateBackendError(errorText: string | null | undefined): string | null {
        if (!errorText) return null;

        if (errorText.includes('|')) {
            const [key, paramsJson] = errorText.split('|');
            const translationKey = key.replace('pages.uploadData.apiErrors.', '');
            try {
                const params = JSON.parse(paramsJson);
                try {
                    // @ts-expect-error - Dynamic translation key
                    return t(`apiErrors.${translationKey}`, params);
                } catch {
                    return errorText;
                }
            } catch {
                try {
                    // @ts-expect-error - Dynamic translation key
                    return t(`apiErrors.${translationKey}`);
                } catch {
                    return errorText;
                }
            }
        }

        if (errorText.startsWith('pages.uploadData.apiErrors.')) {
            const translationKey = errorText.replace('pages.uploadData.apiErrors.', '');
            try {
                // @ts-expect-error - Dynamic translation key
                return t(`apiErrors.${translationKey}`);
            } catch {
                return t('apiErrors.processingError');
            }
        }

        return errorText;
    }

    function handleVecKblSubmit(file: File) {
        const currentRequestId = requestIdRef.current + 1;
        requestIdRef.current = currentRequestId;

        updateState({
            vecKblFile: file,
            activeStep: 1, // Move to processing step
            uploadStatus: 'processing',
            processingStatus: 'idle',
            generateAasStatus: 'idle',
            errorMessage: null,
            errorDetail: null,
            warnings: [],
            rawDebugInfo: [],
        });

        const formData = new FormData();
        formData.append('file', file);

        startTransition(async () => {
            try {
                const response = await processData(formData);

                if (currentRequestId !== requestIdRef.current) return;

                if (!response.isSuccess || !response.result) {
                    const errorMessage = !response.isSuccess
                        ? translateBackendError(response.message) || t('apiErrors.uploadError')
                        : t('apiErrors.uploadError');
                    updateState({
                        uploadStatus: 'error',
                        errorMessage,
                    });
                    return;
                }

                // Process workflow steps
                for (const update of response.result) {
                    if (currentRequestId !== requestIdRef.current) return;

                    const { name, status } = update.currentStep;

                    if (name === 'upload') {
                        updateState({
                            uploadStatus:
                                status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'processing',
                        });
                    } else if (name === 'process') {
                        updateState({
                            processingStatus:
                                status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'processing',
                        });
                    } else if (name === 'generateAas') {
                        updateState({
                            generateAasStatus:
                                status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'processing',
                        });
                        // HACK: Automatically move to the next step after the AAS is generated, since it will be shown again in another component
                        if (status === 'completed') {
                            updateState({ activeStep: 2 }); // Move to thumbnail step when AAS generation is complete
                        }
                    }

                    if (status === 'failed') {
                        const translatedError =
                            translateBackendError(update.currentStep.error) ?? t('apiErrors.processingError');
                        const translatedDetail = translateBackendError(update.currentStep.errorDetail);
                        updateState({
                            errorMessage: translatedError,
                            errorDetail: translatedDetail,
                        });
                        return;
                    }
                }

                // Extract final result
                const finalUpdate = response.result[response.result.length - 1];
                if (finalUpdate.result) {
                    updateState({
                        aasId: finalUpdate.result.aasId || null,
                        base64EncodedAasId: finalUpdate.result.base64EncodedAasId || null,
                        aasRepoUrl: finalUpdate.result.aasRepoUrl || null,
                        handoverDocSubmodelId: finalUpdate.result.handoverDocSubmodelId || null,
                        organizationName: finalUpdate.result.organizationName || null,
                        redirectUrl: finalUpdate.result.redirectUrl || null,
                        warnings: finalUpdate.result.warnings || [],
                        rawDebugInfo: finalUpdate.result.rawDebugInfo || [],
                    });
                }
            } catch (error) {
                if (currentRequestId !== requestIdRef.current) return;
                const errorMessage = error instanceof Error ? error.message : t('apiErrors.uploadError');
                updateState({
                    uploadStatus: 'error',
                    errorMessage,
                });
            }
        });
    }

    function handleThumbnailSuccess() {
        updateState({
            thumbnailUploaded: true,
            activeStep: 3, // Move to additional documents step
        });
    }

    function handleAdditionalDocsSkip() {
        updateState({ activeStep: 4 }); // Move to complete step
    }

    function handleAdditionalDocsComplete() {
        updateState({ activeStep: 4 }); // Move to complete step
    }

    function handleCreateAnother() {
        requestIdRef.current += 1;
        setState(initialState);
    }

    function getStepLabel(index: number): string {
        const step = WORKFLOW_STEPS[index];
        // @ts-expect-error - Dynamic translation key
        return t(step.labelKey);
    }

    function isStepComplete(index: number): boolean {
        switch (index) {
            case 0: // VEC/KBL Upload
                return state.activeStep > 0;
            case 1: // Processing
                return state.generateAasStatus === 'success';
            case 2: // Thumbnail
                return state.thumbnailUploaded;
            case 3: // Additional Docs
                return state.activeStep > 3;
            case 4: // Complete
                return false; // Final step is never "complete"
            default:
                return false;
        }
    }

    function isStepError(index: number): boolean {
        if (index === 1) {
            return (
                state.uploadStatus === 'error' ||
                state.processingStatus === 'error' ||
                state.generateAasStatus === 'error'
            );
        }
        return false;
    }

    function renderStepContent(index: number) {
        switch (index) {
            case 0:
                return <StepVecKblUpload onFileSubmit={handleVecKblSubmit} disabled={isPending} />;
            case 1:
                return state.vecKblFile ? (
                    <StepProcessing
                        file={state.vecKblFile}
                        uploadStatus={state.uploadStatus}
                        processingStatus={state.processingStatus}
                        generateAasStatus={state.generateAasStatus}
                        errorMessage={state.errorMessage}
                        errorDetail={state.errorDetail}
                        warnings={state.warnings}
                        rawDebugInfo={state.rawDebugInfo}
                    />
                ) : null;
            case 2:
                return state.aasId && state.aasRepoUrl ? (
                    <StepThumbnail
                        aasId={state.aasId}
                        aasRepoUrl={state.aasRepoUrl}
                        onUploadSuccess={handleThumbnailSuccess}
                        disabled={isPending}
                    />
                ) : null;
            case 3:
                return state.handoverDocSubmodelId && state.aasRepoUrl && state.organizationName ? (
                    <StepAdditionalDocuments
                        submodelId={state.handoverDocSubmodelId}
                        repositoryUrl={state.aasRepoUrl}
                        organizationName={state.organizationName}
                        startIndex={2} // Document01 is the VEC/KBL file, start at Document02
                        onSkip={handleAdditionalDocsSkip}
                        onComplete={handleAdditionalDocsComplete}
                        disabled={isPending}
                    />
                ) : null;
            case 4:
                return state.redirectUrl ? (
                    <StepComplete redirectUrl={state.redirectUrl} onCreateAnother={handleCreateAnother} />
                ) : null;
            default:
                return null;
        }
    }

    // Handle retry after error in processing step
    function handleRetry() {
        setState(initialState);
    }

    return (
        <Box sx={{ position: 'relative' }}>
            {state.activeStep > 0 && (
                <Button
                    variant="text"
                    size="small"
                    onClick={handleRetry}
                    sx={{ position: 'absolute', top: 0, right: 0 }}
                >
                    {t('actions.resetWorkflow')}
                </Button>
            )}
            <Stepper activeStep={state.activeStep} orientation="vertical">
                {WORKFLOW_STEPS.map((step, index) => (
                    <Step key={step.id} completed={isStepComplete(index)}>
                        <StepLabel
                            error={isStepError(index)}
                            optional={
                                index === 3 ? (
                                    <Typography variant="caption" color="text.secondary">
                                        Optional
                                    </Typography>
                                ) : undefined
                            }
                        >
                            {getStepLabel(index)}
                        </StepLabel>
                        {/* HACK This component will be rendered just for displaying the logs and the filename after completing the processing step  so the user can see which file they uploaded*/}
                        {index === 1 && state.vecKblFile && state.activeStep > 1 && (
                            <StepProcessing
                                file={state.vecKblFile}
                                uploadStatus={state.uploadStatus}
                                processingStatus={state.processingStatus}
                                generateAasStatus={state.generateAasStatus}
                                errorMessage={state.errorMessage}
                                errorDetail={state.errorDetail}
                                warnings={state.warnings}
                                rawDebugInfo={state.rawDebugInfo}
                            />
                        )}
                        <StepContent>
                            {renderStepContent(index)}
                            {/* Show retry button on error */}
                            {isStepError(index) && (
                                <Box sx={{ mt: 2 }}>
                                    <Button variant="outlined" onClick={handleRetry}>
                                        {t('actions.uploadMore')}
                                    </Button>
                                </Box>
                            )}
                        </StepContent>
                    </Step>
                ))}
            </Stepper>
        </Box>
    );
}
