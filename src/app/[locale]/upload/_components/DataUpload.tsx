'use client';

import { ChangeEvent, useEffect, useId, useRef, useState, useTransition } from 'react';
import { Button, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslations } from 'next-intl';
import { processData } from 'lib/services/data-upload/dataUploadAction';
import DragAndDrop from './DragAndDrop';
import ThumbnailUpload from './ThumbnailUpload';
import { useRouter } from 'next/navigation';
import CancelIcon from '@mui/icons-material/Cancel';
import { useEnv } from 'app/EnvProvider';

export interface DataUploadProps {
    onFileSelected?: (file: File) => void;
    onError?: (message: string) => void;
    onFileRemoved?: () => void;
}

/**
 * Main data upload component for VEC files.
 *
 * Renders the full upload workflow, including:
 * - Form fields for user and organization information
 * - Accessible drag-and-drop and file input for selecting VEC files
 * - File handling, upload, processing, and AAS generation logic
 * - Error handling and workflow status management
 * - Accessibility features for all interactive elements
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
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const requestIdRef = useRef(0);
    const t = useTranslations('pages.uploadData');
    const componentId = useId();
    const envs = useEnv();
    const fileInputId = `${componentId}-input`;
    const helpTextId = `${componentId}-help`;
    const errorTextId = `${componentId}-error`;

    const MAX_FILE_SIZE_MB = 10;
    const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024; // 10 MB
    const ACCEPTABLE_FILE_EXTENSIONS = ['.vec', '.kbl'];
    const ACCEPTABLE_MIME_TYPES = ['application/octet-stream', 'text/plain'];
    const ACCEPTABLE_FILE_TYPES = [...ACCEPTABLE_FILE_EXTENSIONS, ...ACCEPTABLE_MIME_TYPES].join(',');

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

    function stopProgressSimulation() {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
    }

    function handleStepFailure(step: StepKey, message: string, detail?: string) {
        stopProgressSimulation();
        stepStatusSetters[step]('error');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        updateError(message, detail);
    }

    function resetWorkflowState() {
        stopProgressSimulation();
        (['upload', 'process', 'generateAas'] as StepKey[]).forEach((step) => {
            stepStatusSetters[step]('idle');
        });
        setRedirectUrl(null);
        setWarnings([]);
        setAasId(null);
    }

    useEffect(() => () => stopProgressSimulation(), []);

    function isVecFile(file: File): boolean {
        const fileName = file.name.toLowerCase();
        const hasValidExtension = ACCEPTABLE_FILE_EXTENSIONS.some((extension) => fileName.endsWith(extension));
        const hasValidMimeType = ACCEPTABLE_MIME_TYPES.includes(file.type);

        return hasValidExtension || hasValidMimeType;
    }

    function handleFileSelection(file: File) {
        updateError(null);

        if (!isVecFile(file)) {
            const message = t('fileTypeNotSupported');
            updateError(message);
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            const message = t('fileTooLarge', { maxSize: formatFileSize(MAX_FILE_SIZE) });
            updateError(message);
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        setSelectedFile(file);
        if (onFileSelected) {
            onFileSelected(file);
        }
    }

    function submitUpload() {
        if (!selectedFile) {
            updateError(t('form.errors.fileRequired'));
            return;
        }

        const currentRequestId = requestIdRef.current + 1;
        requestIdRef.current = currentRequestId;

        stopProgressSimulation();
        resetWorkflowState();
        updateError(null);

        // Set upload status immediately when user clicks submit
        stepStatusSetters['upload']('uploading');

        const formData = new FormData();
        formData.append('file', selectedFile);

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

    function clearSelectedFile() {
        requestIdRef.current += 1;
        setSelectedFile(null);
        updateError(null);
        resetWorkflowState();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (onFileRemoved) {
            onFileRemoved();
        }
    }

    function clearAfterWorkflowComplete() {
        requestIdRef.current += 1;
        setSelectedFile(null);
        updateError(null);
        resetWorkflowState();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (onFileRemoved) {
            onFileRemoved();
        }
    }

    function formatFileSize(bytes: number) {
        if (bytes === 0) {
            return '0 B';
        }
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const value = bytes / Math.pow(k, i);
        return `${value >= 10 || i === 0 ? value.toFixed(0) : value.toFixed(1)} ${sizes[i]}`;
    }

    function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        const { files } = event.target;
        if (!files || files.length === 0) {
            return;
        }
        handleFileSelection(files[0]);
    }

    function handleBrowseClick() {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }

    function handleFilesDropped(files: FileList) {
        if (!files || files.length === 0) {
            return;
        }
        handleFileSelection(files[0]);
    }

    function renderWorkflowCard() {
        // Only show the card if workflow has started
        const hasWorkflowStarted =
            uploadStatus !== 'idle' || processingStatus !== 'idle' || generateAasStatus !== 'idle';

        if (!selectedFile || !hasWorkflowStarted) {
            return null;
        }

        // Determine current step and status
        let currentStepTitle = '';
        let currentStatus: UploadStatus = 'idle';
        let isComplete = false;
        let isError = false;
        let errorText: string | null = null;

        if (generateAasStatus === 'success') {
            isComplete = true;
            currentStatus = 'success';
        } else if (generateAasStatus === 'uploading' || generateAasStatus === 'error') {
            currentStepTitle = t('steps.generateAas');
            currentStatus = generateAasStatus;
        } else if (processingStatus === 'uploading' || processingStatus === 'error') {
            currentStepTitle = t('steps.processData');
            currentStatus = processingStatus;
        } else if (uploadStatus === 'uploading' || uploadStatus === 'error') {
            currentStepTitle = t('steps.uploadFile');
            currentStatus = uploadStatus;
        } else if (processingStatus === 'success') {
            currentStepTitle = t('steps.generateAas');
            currentStatus = 'uploading';
        } else if (uploadStatus === 'success') {
            currentStepTitle = t('steps.processData');
            currentStatus = 'uploading';
        }

        if (uploadStatus === 'error' || processingStatus === 'error' || generateAasStatus === 'error') {
            isError = true;
            errorText = errorMessage;
        }

        const statusLabel =
            currentStatus === 'success'
                ? t('status.success')
                : currentStatus === 'uploading'
                  ? t('status.loading')
                  : currentStatus === 'error'
                    ? t('status.error')
                    : null;

        const showProgress = !isComplete && !isError && hasWorkflowStarted;

        return (
            <Stack
                spacing={1.5}
                border="1px solid"
                borderColor="divider"
                borderRadius={2}
                padding={2}
                bgcolor="background.paper"
                aria-live="polite"
                role="status"
            >
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                    <Stack spacing={0.5} flex={1}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="body2" fontWeight={600} noWrap title={selectedFile.name}>
                                {selectedFile.name}
                            </Typography>
                            {isError && (
                                <IconButton
                                    size="small"
                                    aria-label={t('actions.removeFile')}
                                    onClick={clearAfterWorkflowComplete}
                                >
                                    <CancelIcon fontSize="small" />
                                </IconButton>
                            )}
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                                {formatFileSize(selectedFile.size)}
                            </Typography>
                            {statusLabel && (
                                <Typography variant="caption" color="text.secondary">
                                    • {statusLabel}
                                </Typography>
                            )}
                        </Stack>
                        <Typography
                            variant="caption"
                            color={isComplete ? 'success.main' : isError && errorText ? 'error' : 'text.secondary'}
                            fontWeight={isComplete || (isError && errorText) ? 600 : 400}
                            sx={{ minHeight: '18px' }}
                        >
                            {isComplete ? t('uploadSuccess') : isError && errorText ? errorText : currentStepTitle}
                        </Typography>
                        {isError && errorDetail && (
                            <Typography
                                variant="caption"
                                color="error"
                                sx={{
                                    display: 'block',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {errorDetail}
                            </Typography>
                        )}
                        {isComplete && warnings.length > 0 && (
                            <Stack spacing={0.5} mt={1}>
                                <Typography variant="caption" color="warning.main" fontWeight={600}>
                                    {t('warningsEncountered')}
                                </Typography>
                                {warnings.map((warning, index) => (
                                    <Typography
                                        key={index}
                                        variant="caption"
                                        color="warning.dark"
                                        sx={{
                                            display: 'block',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            pl: 1,
                                        }}
                                    >
                                        • {warning}
                                    </Typography>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                    <LinearProgress
                        variant={showProgress ? 'indeterminate' : 'determinate'}
                        value={100}
                        color={isError ? 'error' : isComplete ? 'success' : 'primary'}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            width: '100px',
                            visibility: showProgress || isComplete || isError ? 'visible' : 'hidden',
                        }}
                    />
                    {isComplete && (
                        <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                    )}
                </Stack>
            </Stack>
        );
    }

    return (
        <Stack spacing={2}>
            <Typography variant="h6" fontWeight={600}>
                {t('uploadSection.title')}
            </Typography>            
            <input
                id={fileInputId}
                ref={fileInputRef}
                type="file"
                accept={ACCEPTABLE_FILE_TYPES}
                onChange={handleInputChange}
                hidden
            />  
            {uploadStatus === 'idle' && processingStatus === 'idle' && generateAasStatus === 'idle' && (
                <Stack spacing={2}>

                    <DragAndDrop
                        onBrowse={handleBrowseClick}
                        onDropFiles={handleFilesDropped}
                        helpTextId={helpTextId}
                        errorTextId={errorTextId}
                        hasError={Boolean(errorMessage)}
                        selectedFile={selectedFile}
                        onDeleteFile={clearSelectedFile}
                        formatFileSize={formatFileSize}
                        supportedFileTypes={ACCEPTABLE_FILE_EXTENSIONS.join(', ')}
                        maxSizeMB={MAX_FILE_SIZE_MB}
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={submitUpload}
                        disabled={!selectedFile || isPending}
                    >
                        {t('form.submitLabel')}
                    </Button>
                </Stack>
            )}
            {renderWorkflowCard()}
            {uploadStatus === 'success' && processingStatus === 'success' && generateAasStatus === 'success' && (
                <Stack spacing={2}>
                    {aasId && envs.AAS_REPO_API_URL && (
                        <ThumbnailUpload aasId={aasId} aasRepoUrl={envs.AAS_REPO_API_URL} />
                    )}
                    <Stack direction="row" spacing={2}>
                        {redirectUrl && (
                            <Button variant="contained" color="primary" onClick={() => navigate.push(redirectUrl)}>
                                {t('actions.viewCreatedAas')}
                            </Button>
                        )}
                        <Button variant="outlined" color="primary" onClick={clearSelectedFile}>
                            {t('actions.uploadMore')}
                        </Button>
                    </Stack>
                </Stack>
            )}
            {errorMessage && uploadStatus === 'idle' && processingStatus === 'idle' && generateAasStatus === 'idle' ? (
                <Typography id={errorTextId} variant="body2" color="error" role="alert" aria-live="assertive">
                    {errorMessage}
                </Typography>
            ) : null}
        </Stack>
    );
}
