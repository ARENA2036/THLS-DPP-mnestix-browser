'use client';

import { useRef, useState, useTransition } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { processData } from 'lib/services/data-upload/dataUploadAction';
import FileUploadForm from './FileUploadForm';
import UploadWorkflowCard from './UploadWorkflowCard';
import ThumbnailUpload from './ThumbnailUpload';
import { useRouter } from 'next/navigation';
import { useEnv } from 'app/EnvProvider';

export interface DataUploadProps {
    onFileSelected?: (file: File) => void;
    onError?: (message: string) => void;
    onFileRemoved?: () => void;
}

/**
 * Main data upload component for VEC files.
 * Orchestrates the upload workflow, manages state, and coordinates child components.
 */
type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

type StepKey = 'upload' | 'process' | 'generateAas';

export default function DataUpload(props: DataUploadProps) {
    const { onFileSelected, onError, onFileRemoved } = props;
    const navigate = useRouter();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [errorDetail, setErrorDetail] = useState<string | null>(null);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
    const [processingStatus, setProcessingStatus] = useState<UploadStatus>('idle');
    const [generateAasStatus, setGenerateAasStatus] = useState<UploadStatus>('idle');
    const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [aasId, setAasId] = useState<string | null>(null);
    const [isPending, startUploadTransition] = useTransition();
    const requestIdRef = useRef(0);
    const t = useTranslations('pages.uploadData');
    const envs = useEnv();

    const MAX_FILE_SIZE_MB = 10;
    const ACCEPTABLE_FILE_EXTENSIONS = ['.vec', '.kbl'];
    const ACCEPTABLE_MIME_TYPES = ['application/octet-stream', 'text/plain'];

    const stepStatusSetters: Record<StepKey, (status: UploadStatus) => void> = {
        upload: setUploadStatus,
        process: setProcessingStatus,
        generateAas: setGenerateAasStatus,
    };

    function updateError(message: string | null, detail?: string | null) {
        setErrorMessage(message);
        setErrorDetail(detail || null);
        if (message && onError) {
            onError(message);
        }
    }

    function translateBackendError(errorText: string | null | undefined): string | null {
        if (!errorText) return null;

        // Check if it's a translation key with parameters (format: "key|{json}")
        if (errorText.includes('|')) {
            const [key, paramsJson] = errorText.split('|');
            const translationKey = key.replace('pages.uploadData.apiErrors.', '');
            try {
                const params = JSON.parse(paramsJson);
                // Try to translate with parameters, fallback to original on error
                try {
                    // @ts-expect-error - Dynamic translation key, fallback handles invalid keys
                    return t(`apiErrors.${translationKey}`, params);
                } catch {
                    return errorText;
                }
            } catch {
                // JSON parse failed, try without parameters
                try {
                    // @ts-expect-error - Dynamic translation key, fallback handles invalid keys
                    return t(`apiErrors.${translationKey}`);
                } catch {
                    return errorText;
                }
            }
        }

        // Check if it's a simple translation key
        if (errorText.startsWith('pages.uploadData.apiErrors.')) {
            const translationKey = errorText.replace('pages.uploadData.apiErrors.', '');
            try {
                // @ts-expect-error - Dynamic translation key, fallback handles invalid keys
                return t(`apiErrors.${translationKey}`);
            } catch {
                // Translation key doesn't exist, return generic error
                return t('apiErrors.processingError');
            }
        }

        // Return as-is if not a translation key
        return errorText;
    }

    function handleStepFailure(step: StepKey, message: string, detail?: string) {
        stepStatusSetters[step]('error');
        updateError(message, detail);
    }

    function resetWorkflowState() {
        (['upload', 'process', 'generateAas'] as StepKey[]).forEach((step) => {
            stepStatusSetters[step]('idle');
        });
        setRedirectUrl(null);
        setWarnings([]);
        setAasId(null);
    }

    function handleFileSubmit(file: File) {
        setSelectedFile(file);
        if (onFileSelected) {
            onFileSelected(file);
        }

        const currentRequestId = requestIdRef.current + 1;
        requestIdRef.current = currentRequestId;

        resetWorkflowState();
        updateError(null);

        // Set upload status immediately when user clicks submit
        stepStatusSetters['upload']('uploading');

        const formData = new FormData();
        formData.append('file', file);

        startUploadTransition(async () => {
            try {
                const response = await processData(formData);

                if (currentRequestId !== requestIdRef.current) {
                    return;
                }

                if (!response.isSuccess || !response.result) {
                    const errorMessage = !response.isSuccess ? response.message : t('apiErrors.uploadError');
                    const errorDetail = !response.isSuccess ? response.errorDetail : undefined;
                    handleStepFailure('upload', errorMessage, errorDetail);
                    return;
                }

                // Process each update sequentially
                for (const update of response.result) {
                    if (currentRequestId !== requestIdRef.current) {
                        return;
                    }

                    const { name, status } = update.currentStep;

                    if (!Object.prototype.hasOwnProperty.call(stepStatusSetters, name)) {
                        continue;
                    }

                    const stepName = name as StepKey;

                    if (status === 'processing') {
                        stepStatusSetters[stepName]('processing');
                    } else if (status === 'completed') {
                        stepStatusSetters[stepName]('success');
                    } else if (status === 'failed') {
                        stepStatusSetters[stepName]('error');
                        const translatedError =
                            translateBackendError(update.currentStep.error) ?? t('apiErrors.processingError');
                        const translatedDetail = translateBackendError(update.currentStep.errorDetail);
                        updateError(translatedError, translatedDetail);
                        return;
                    }

                    // Small delay for visual feedback
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }

                // Set final result
                if (currentRequestId !== requestIdRef.current) {
                    return;
                }

                const finalUpdate = response.result[response.result.length - 1];
                if (finalUpdate.result?.redirectUrl) {
                    setRedirectUrl(finalUpdate.result.redirectUrl);
                }
                if (finalUpdate.result?.warnings) {
                    setWarnings(finalUpdate.result.warnings);
                }
                if (finalUpdate.result?.aasId) {
                    setAasId(finalUpdate.result.aasId);
                }
            } catch (error) {
                if (currentRequestId !== requestIdRef.current) {
                    return;
                }
                const errorMessage = error instanceof Error ? error.message : t('apiErrors.uploadError');
                handleStepFailure('upload', errorMessage);
            }
        });
    }

    function clearAfterWorkflowComplete() {
        requestIdRef.current += 1;
        setSelectedFile(null);
        updateError(null);
        resetWorkflowState();
        if (onFileRemoved) {
            onFileRemoved();
        }
    }

    return (
        <Stack spacing={4}>
            <Stack spacing={2}>
                <Typography variant="h6" fontWeight={600}>
                    {t('uploadSection.title')}
                </Typography>
                {uploadStatus === 'idle' && processingStatus === 'idle' && generateAasStatus === 'idle' && (
                    <FileUploadForm
                        onSubmit={handleFileSubmit}
                        maxFileSizeMB={MAX_FILE_SIZE_MB}
                        acceptableExtensions={ACCEPTABLE_FILE_EXTENSIONS}
                        acceptableMimeTypes={ACCEPTABLE_MIME_TYPES}
                        disabled={isPending}
                    />
                )}
                {selectedFile && (uploadStatus !== 'idle' || processingStatus !== 'idle' || generateAasStatus !== 'idle') && (
                    <UploadWorkflowCard
                        file={selectedFile}
                        uploadStatus={uploadStatus}
                        processingStatus={processingStatus}
                        generateAasStatus={generateAasStatus}
                        errorMessage={errorMessage}
                        errorDetail={errorDetail}
                        warnings={warnings}
                        onRemove={clearAfterWorkflowComplete}
                    />
                )}
            </Stack>
            {uploadStatus === 'success' && processingStatus === 'success' && generateAasStatus === 'success' && (
                <Stack spacing={4}>
                    {aasId && envs.AAS_REPO_API_URL && (
                        <ThumbnailUpload aasId={aasId} aasRepoUrl={envs.AAS_REPO_API_URL} />
                    )}
                    <Stack direction="row" spacing={2}>
                        {redirectUrl && (
                            <Button variant="contained" color="primary" onClick={() => navigate.push(redirectUrl)}>
                                {t('actions.viewCreatedAas')}
                            </Button>
                        )}
                        <Button variant="outlined" color="primary" onClick={clearAfterWorkflowComplete}>
                            {t('actions.uploadMore')}
                        </Button>
                    </Stack>
                </Stack>
            )}
        </Stack>
    );
}
