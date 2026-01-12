'use client';

import { IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useTranslations } from 'next-intl';
import { formatFileSize } from './DataUploadUtils';
import { CopyButton } from 'components/basics/CopyButton';

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export interface UploadWorkflowCardProps {
    file: File;
    uploadStatus: UploadStatus;
    processingStatus: UploadStatus;
    generateAasStatus: UploadStatus;
    errorMessage: string | null;
    errorDetail: string | null;
    warnings: string[];
    rawDebugInfo: string[];
    onRemove: () => void;
}

/**
 * Displays the upload workflow progress card.
 * Shows file information, current step, progress bar, and any warnings or errors.
 */
export default function UploadWorkflowCard(props: UploadWorkflowCardProps) {
    const {
        file,
        uploadStatus,
        processingStatus,
        generateAasStatus,
        errorMessage,
        errorDetail,
        warnings,
        rawDebugInfo,
        onRemove,
    } = props;
    const t = useTranslations('pages.uploadData');

    // Determine current step and status
    let currentStepTitle = '';
    let currentStatus: UploadStatus = 'idle';
    let isComplete = false;
    let isError = false;

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
    }

    const statusLabel =
        currentStatus === 'success'
            ? t('status.success')
            : currentStatus === 'uploading'
              ? t('status.loading')
              : currentStatus === 'error'
                ? t('status.error')
                : null;

    const showProgress = !isComplete && !isError;
    const shouldShowCopyButton = (isError || warnings.length > 0) && rawDebugInfo.length > 0;

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
                        <Typography variant="body2" fontWeight={600} noWrap title={file.name}>
                            {file.name}
                        </Typography>
                        {isError && (
                            <IconButton size="small" aria-label={t('actions.removeFile')} onClick={onRemove}>
                                <CancelIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                            {formatFileSize(file.size)}
                        </Typography>
                        {statusLabel && (
                            <Typography variant="caption" color="text.secondary">
                                • {statusLabel}
                            </Typography>
                        )}
                    </Stack>
                    <Typography
                        variant="caption"
                        color={isComplete ? 'success.main' : isError && errorMessage ? 'error' : 'text.secondary'}
                        fontWeight={isComplete || (isError && errorMessage) ? 600 : 400}
                        sx={{ minHeight: '18px' }}
                    >
                        {isComplete ? t('uploadSuccess') : isError && errorMessage ? errorMessage : currentStepTitle}
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
                    {shouldShowCopyButton && (
                        <Stack direction="row" alignItems="center" sx={{ mt: 1 }}>
                            <Typography variant="caption" sx={{ mr: 0.5 }}>
                                {t('actions.copyDetailedLogs')}
                            </Typography>
                            <CopyButton
                                value={rawDebugInfo.join('\n')}
                                size="small"
                                dataTestId="copy-debug-logs-button"
                            />
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
                {isComplete && <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />}
            </Stack>
        </Stack>
    );
}
