'use client';

import { LinearProgress, Stack, Typography, Box, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useTranslations } from 'next-intl';
import { formatFileSize } from './DataUploadUtils';
import { CopyButton } from 'components/basics/CopyButton';

type StepStatus = 'idle' | 'processing' | 'success' | 'error';

export interface StepProcessingProps {
    /** The uploaded file */
    file: File;
    /** Upload step status */
    uploadStatus: StepStatus;
    /** Processing step status */
    processingStatus: StepStatus;
    /** Generate AAS step status */
    generateAasStatus: StepStatus;
    /** Error message if any step failed */
    errorMessage: string | null;
    /** Detailed error message */
    errorDetail: string | null;
    /** Warnings from processing */
    warnings: string[];
    /** Detailed debug info from backend */
    rawDebugInfo: string[];
    /** Callback when user clicks Next to proceed to thumbnail step */
    onNext: () => void;
}

/**
 * Step 2: Processing
 * Shows the progress of DPP generation (upload, process, generate AAS).
 * This step auto-advances when complete.
 */
export default function StepProcessing(props: StepProcessingProps) {
    const {
        file,
        uploadStatus,
        processingStatus,
        generateAasStatus,
        errorMessage,
        errorDetail,
        warnings,
        rawDebugInfo,
        onNext,
    } = props;
    const t = useTranslations('pages.uploadData');

    // Determine current step
    let currentStep = '';
    let isComplete = false;
    let isError = false;
    const shouldShowCopyButton = (isError || warnings.length > 0) && rawDebugInfo.length > 0;

    if (generateAasStatus === 'success') {
        isComplete = true;
    } else if (generateAasStatus === 'processing' || generateAasStatus === 'error') {
        currentStep = t('steps.generateAas');
        isError = generateAasStatus === 'error';
    } else if (processingStatus === 'processing' || processingStatus === 'error') {
        currentStep = t('steps.processData');
        isError = processingStatus === 'error';
    } else if (uploadStatus === 'processing' || uploadStatus === 'error') {
        currentStep = t('steps.uploadFile');
        isError = uploadStatus === 'error';
    } else if (processingStatus === 'success') {
        currentStep = t('steps.generateAas');
    } else if (uploadStatus === 'success') {
        currentStep = t('steps.processData');
    }

    return (
        <Stack spacing={2}>
            {/* File info */}
            <Box
                sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: 'grey.50',
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                        <Typography variant="body2" fontWeight={500}>
                            {file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {formatFileSize(file.size)}
                        </Typography>
                    </Box>
                    {isComplete && <CheckCircleIcon color="success" />}
                    {isError && <ErrorIcon color="error" />}
                </Stack>
            </Box>

            {/* Progress */}
            {!isComplete && !isError && (
                <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                        {currentStep}
                    </Typography>
                    <LinearProgress variant="indeterminate" />
                </Stack>
            )}

            {/* Success message */}
            {isComplete && (
                <Typography variant="body2" color="success.main" fontWeight={500}>
                    {t('uploadSuccess')}
                </Typography>
            )}

            {/* Error message */}
            {isError && errorMessage && (
                <Stack spacing={1}>
                    <Typography variant="body2" color="error" fontWeight={500}>
                        {errorMessage}
                    </Typography>
                    {errorDetail && (
                        <Typography variant="caption" color="error">
                            {errorDetail}
                        </Typography>
                    )}
                </Stack>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
                <Stack spacing={0.5}>
                    <Typography variant="body2" color="warning.main" fontWeight={500}>
                        {t('warningsEncountered')}
                    </Typography>
                    {warnings.map((warning, index) => (
                        <Typography key={index} variant="caption" color="warning.main">
                            • {warning}
                        </Typography>
                    ))}
                </Stack>
            )}
            {/* Copy detailed logs button */}
            {shouldShowCopyButton && (
                <Stack direction="row" alignItems="center" sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ mr: 0.5 }}>
                        {t('actions.copyDetailedLogs')}
                    </Typography>
                    <CopyButton value={rawDebugInfo.join('\n')} size="small" dataTestId="copy-debug-logs-button" />
                </Stack>
            )}

            {/* Next button - shown when processing is complete */}
            {isComplete && (
                <Box sx={{ mt: 1 }}>
                    <Button variant="contained" onClick={onNext}>
                        {t('actions.next')}
                    </Button>
                </Box>
            )}
        </Stack>
    );
}
