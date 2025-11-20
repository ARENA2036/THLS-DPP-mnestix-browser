'use client';

import { ChangeEvent, useEffect, useId, useRef, useState, useTransition } from 'react';
import { Button, IconButton, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { processData } from 'lib/services/data-upload/dataUploadAction';
import DragAndDrop from './DragAndDrop';
import { useRouter } from 'next/navigation';
import CancelIcon from '@mui/icons-material/Cancel';

export interface DataUploadProps {
    onFileSelected?: (file: File) => void;
    onError?: (message: string) => void;
    onFileRemoved?: () => void;
}

/**
 * Renders an accessible drag-and-drop area for uploading data VEC files.
 */
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

type StepKey = 'upload' | 'process' | 'generateAas';

export default function DataUpload(props: DataUploadProps) {
    const { onFileSelected, onError, onFileRemoved } = props;
    const navigate = useRouter();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
    const [processingStatus, setProcessingStatus] = useState<UploadStatus>('idle');
    const [generateAasStatus, setGenerateAasStatus] = useState<UploadStatus>('idle');
    const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
    const [userName, setUserName] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [userNameError, setUserNameError] = useState<string | null>(null);
    const [organizationNameError, setOrganizationNameError] = useState<string | null>(null);
    const [isPending, startUploadTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const requestIdRef = useRef(0);
    const t = useTranslations('pages.uploadData');
    const componentId = useId();
    const fileInputId = `${componentId}-input`;
    const helpTextId = `${componentId}-help`;
    const errorTextId = `${componentId}-error`;
    const userNameId = `${componentId}-user-name`;
    const organizationId = `${componentId}-organization-name`;
    const userNameHelperId = `${userNameId}-helper`;
    const organizationHelperId = `${organizationId}-helper`;

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    const ACCEPTABLE_FILE_EXTENSIONS = ['.vec'];
    const ACCEPTABLE_MIME_TYPES = ['application/octet-stream', 'text/plain'];
    const ACCEPTABLE_FILE_TYPES = [...ACCEPTABLE_FILE_EXTENSIONS, ...ACCEPTABLE_MIME_TYPES].join(',');

    const stepStatusSetters: Record<StepKey, (status: UploadStatus) => void> = {
        upload: setUploadStatus,
        process: setProcessingStatus,
        generateAas: setGenerateAasStatus,
    };

    function updateError(message: string | null) {
        setErrorMessage(message);
        if (message && onError) {
            onError(message);
        }
    }

    function stopProgressSimulation() {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
    }

    function handleStepFailure(step: StepKey, message: string) {
        stopProgressSimulation();
        stepStatusSetters[step]('error');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        updateError(message);
    }

    function resetWorkflowState() {
        stopProgressSimulation();
        (['upload', 'process', 'generateAas'] as StepKey[]).forEach((step) => {
            stepStatusSetters[step]('idle');
        });
        setRedirectUrl(null);
    }

    useEffect(() => () => stopProgressSimulation(), []);

    function validateForm() {
        let isValid = true;
        if (!userName.trim()) {
            setUserNameError(t('form.errors.userNameRequired'));
            isValid = false;
        } else {
            setUserNameError(null);
        }

        if (!organizationName.trim()) {
            setOrganizationNameError(t('form.errors.organizationRequired'));
            isValid = false;
        } else {
            setOrganizationNameError(null);
        }

        return isValid;
    }

    function handleUserNameChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        setUserName(event.target.value);
        if (userNameError) {
            setUserNameError(null);
        }
    }

    function handleOrganizationNameChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        setOrganizationName(event.target.value);
        if (organizationNameError) {
            setOrganizationNameError(null);
        }
    }

    function isVecFile(file: File): boolean {
        const fileName = file.name.toLowerCase();
        const hasValidExtension = ACCEPTABLE_FILE_EXTENSIONS.some((extension) => fileName.endsWith(extension));
        const hasValidMimeType = ACCEPTABLE_MIME_TYPES.includes(file.type);

        return hasValidExtension || hasValidMimeType;
    }

    function handleFileSelection(file: File) {
        requestIdRef.current += 1;

        stopProgressSimulation();
        resetWorkflowState();
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
        if (!validateForm()) {
            return;
        }

        if (!selectedFile) {
            updateError(t('form.errors.fileRequired'));
            return;
        }

        const currentRequestId = requestIdRef.current + 1;
        requestIdRef.current = currentRequestId;

        stopProgressSimulation();
        resetWorkflowState();
        updateError(null);

        // Set upload status immediately
        stepStatusSetters['upload']('uploading');

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('userName', userName.trim());
        formData.append('organizationName', organizationName.trim());

        startUploadTransition(async () => {
            const response = await processData(formData);

            if (currentRequestId !== requestIdRef.current) {
                return;
            }

            if (!response.isSuccess || !response.result) {
                handleStepFailure('upload', t('uploadError'));
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
                    stepStatusSetters[stepName]('uploading');
                } else if (status === 'completed') {
                    stepStatusSetters[stepName]('success');
                } else if (status === 'failed') {
                    stepStatusSetters[stepName]('error');
                    updateError(update.currentStep.error ?? t('processingError'));
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
        // Only show the card if a file is selected
        if (!selectedFile) {
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

        if (
            uploadStatus === 'error' ||
            processingStatus === 'error' ||
            generateAasStatus === 'error'
        ) {
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

        const hasWorkflowStarted =
            uploadStatus !== 'idle' || processingStatus !== 'idle' || generateAasStatus !== 'idle';
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
                            {(isComplete || isError) && (
                                <IconButton
                                    size="small"
                                    aria-label={t('actions.removeFile')}
                                    onClick={clearSelectedFile}
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
                    </Stack>
                </Stack>
                <LinearProgress
                    variant={showProgress ? 'indeterminate' : 'determinate'}
                    value={100}
                    color={isError ? 'error' : isComplete ? 'success' : 'primary'}
                    sx={{
                        height: 6,
                        borderRadius: 3,
                        maxWidth: '100px',
                        visibility: showProgress || isComplete ? 'visible' : 'hidden',
                    }}
                />
            </Stack>
        );
    }

    return (
        <Stack spacing={2}>
            <Stack spacing={2}>
                <TextField
                    id={userNameId}
                    label={t('form.userNameLabel')}
                    value={userName}
                    onChange={handleUserNameChange}
                    required
                    error={Boolean(userNameError)}
                    helperText={userNameError ?? ' '}
                    FormHelperTextProps={{ id: userNameHelperId }}
                    autoComplete="name"
                />
                <TextField
                    id={organizationId}
                    label={t('form.organizationNameLabel')}
                    value={organizationName}
                    onChange={handleOrganizationNameChange}
                    required
                    error={Boolean(organizationNameError)}
                    helperText={organizationNameError ?? ' '}
                    FormHelperTextProps={{ id: organizationHelperId }}
                    autoComplete="organization"
                />
            </Stack>
            <input
                id={fileInputId}
                ref={fileInputRef}
                type="file"
                accept={ACCEPTABLE_FILE_TYPES}
                onChange={handleInputChange}
                hidden
            />
            <DragAndDrop
                onBrowse={handleBrowseClick}
                onDropFiles={handleFilesDropped}
                helpTextId={helpTextId}
                errorTextId={errorTextId}
                hasError={Boolean(errorMessage)}
            />
            <Button
                variant="contained"
                color="primary"
                onClick={submitUpload}
                disabled={!selectedFile || isPending}
            >
                {t('form.submitLabel')}
            </Button>
            {renderWorkflowCard()}
            {redirectUrl &&
            uploadStatus === 'success' &&
            processingStatus === 'success' &&
            generateAasStatus === 'success' ? (
                <Button variant="contained" color="primary" onClick={() => navigate.push(redirectUrl)}>
                    {t('actions.viewCreatedAas')}
                </Button>
            ) : null}
            {errorMessage ? (
                <Typography id={errorTextId} variant="body2" color="error" role="alert">
                    {errorMessage}
                </Typography>
            ) : null}
        </Stack>
    );
}
