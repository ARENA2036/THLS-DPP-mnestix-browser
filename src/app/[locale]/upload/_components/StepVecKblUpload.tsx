'use client';

import { Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import FileUploadForm from './FileUploadForm';

export interface StepVecKblUploadProps {
    /** Callback when file is selected and submitted */
    onFileSubmit: (file: File) => void;
    /** Whether the form is disabled */
    disabled?: boolean;
}

/**
 * Step 1: Upload VEC/KBL File
 * Allows users to select and submit a VEC or KBL file for DPP generation.
 */
export default function StepVecKblUpload(props: StepVecKblUploadProps) {
    const { onFileSubmit, disabled = false } = props;
    const t = useTranslations('pages.uploadData');

    const MAX_FILE_SIZE_MB = 10;
    const ACCEPTABLE_FILE_EXTENSIONS = ['.vec', '.kbl'];
    const ACCEPTABLE_MIME_TYPES = ['application/octet-stream', 'text/plain', 'application/xml', 'text/xml'];

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                {t('descriptions.supportedFormats')}
            </Typography>
            <FileUploadForm
                onSubmit={onFileSubmit}
                maxFileSizeMB={MAX_FILE_SIZE_MB}
                acceptableExtensions={ACCEPTABLE_FILE_EXTENSIONS}
                acceptableMimeTypes={ACCEPTABLE_MIME_TYPES}
                disabled={disabled}
            />
        </Stack>
    );
}
