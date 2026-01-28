'use client';

import { useState, useTransition } from 'react';
import { Button, LinearProgress, Stack, Typography, Box } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslations } from 'next-intl';
import { uploadThumbnail } from 'lib/services/data-upload/thumbnailUploadAction';
import FileUploadForm from './FileUploadForm';
import { convertPdfToImageClient } from 'lib/util/pdfToImage';

export interface StepThumbnailProps {
    /** AAS ID for thumbnail upload */
    aasId: string;
    /** AAS repository URL */
    aasRepoUrl: string;
    /** Callback when thumbnail is successfully uploaded */
    onUploadSuccess: () => void;
    /** Whether the step is disabled */
    disabled?: boolean;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

/**
 * Step 3: Upload Thumbnail
 * Allows users to upload a product image (required step).
 */
export default function StepThumbnail(props: StepThumbnailProps) {
    const { aasId, aasRepoUrl, onUploadSuccess, disabled = false } = props;
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const t = useTranslations('pages.uploadData');
    const MAX_THUMBNAIL_SIZE_MB = 5;
   
    const ACCEPTABLE_FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
    const ACCEPTABLE_MIME_TYPES = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
    ];

    function translateBackendError(errorText: string | null | undefined): string | null {
        if (!errorText) return null;

        if (errorText.includes('|')) {
            const [key, paramsJson] = errorText.split('|');
            const translationKey = key.replace('pages.uploadData.thumbnail.', '');
            try {
                const params = JSON.parse(paramsJson);
                try {
                    // @ts-expect-error - Dynamic translation key
                    return t(`thumbnail.${translationKey}`, params);
                } catch {
                    return errorText;
                }
            } catch {
                try {
                    // @ts-expect-error - Dynamic translation key
                    return t(`thumbnail.${translationKey}`);
                } catch {
                    return errorText;
                }
            }
        }

        if (errorText.startsWith('pages.uploadData.thumbnail.')) {
            const translationKey = errorText.replace('pages.uploadData.thumbnail.', '');
            try {
                // @ts-expect-error - Dynamic translation key
                return t(`thumbnail.${translationKey}`);
            } catch {
                return t('thumbnail.uploadError');
            }
        }

        return errorText;
    }

    function handleFileSubmit(file: File) {
        setSelectedFile(file);
        setUploadStatus('uploading');
        setErrorMessage(null);

        startTransition(async () => {
            try {
                // Convert PDF to PNG on the client side before uploading
                let fileToUpload = file;
                if (file.type === 'application/pdf') {
                    try {
                        fileToUpload = await convertPdfToImageClient(file);
                    } catch (conversionError) {
                        const errorMsg = conversionError instanceof Error 
                            ? conversionError.message 
                            : t('thumbnail.pdfConversionError');
                        setErrorMessage(errorMsg);
                        setUploadStatus('error');
                        return;
                    }
                }

                const formData = new FormData();
                formData.append('thumbnail', fileToUpload);

                const response = await uploadThumbnail(aasRepoUrl, aasId, formData);

                if (!response.isSuccess) {
                    const errorMsg = translateBackendError(response.message) || t('thumbnail.uploadError');
                    setErrorMessage(errorMsg);
                    setUploadStatus('error');
                    return;
                }

                setUploadStatus('success');
                onUploadSuccess();
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : t('thumbnail.uploadError');
                setErrorMessage(errorMsg);
                setUploadStatus('error');
            }
        });
    }

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                {t('thumbnail.description')}
            </Typography>

            {uploadStatus === 'idle' && (
                <FileUploadForm
                    onSubmit={handleFileSubmit}
                    maxFileSizeMB={MAX_THUMBNAIL_SIZE_MB}
                    acceptableExtensions={ACCEPTABLE_FILE_EXTENSIONS}
                    acceptableMimeTypes={ACCEPTABLE_MIME_TYPES}
                    disabled={disabled || isPending}
                />
            )}

            {selectedFile && uploadStatus !== 'idle' && (
                <Box
                    sx={{
                        p: 2,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: uploadStatus === 'error' ? 'error.main' : 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Stack spacing={1.5}>
                        <Typography variant="body2" fontWeight={500}>
                            {selectedFile.name}
                        </Typography>

                        {uploadStatus === 'uploading' && (
                            <Stack spacing={0.5}>
                                <Typography variant="caption" color="text.secondary">
                                    {t('thumbnail.uploading')}
                                </Typography>
                                <LinearProgress variant="indeterminate" />
                            </Stack>
                        )}

                        {uploadStatus === 'success' && (
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <CheckCircleIcon color="success" fontSize="small" />
                                <Typography variant="body2" color="success.main" fontWeight={500}>
                                    {t('thumbnail.uploadSuccess')}
                                </Typography>
                            </Stack>
                        )}

                        {uploadStatus === 'error' && errorMessage && (
                            <Stack spacing={1}>
                                <Typography variant="body2" color="error">
                                    {errorMessage}
                                </Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => {
                                        setUploadStatus('idle');
                                        setSelectedFile(null);
                                        setErrorMessage(null);
                                    }}
                                >
                                    {t('thumbnail.changeFile')}
                                </Button>
                            </Stack>
                        )}
                    </Stack>
                </Box>
            )}

            {uploadStatus !== 'success' && uploadStatus !== 'idle' && uploadStatus !== 'uploading' && (
                <Typography variant="caption" color="text.secondary">
                    {t('thumbnail.required')}
                </Typography>
            )}
        </Stack>
    );
}
