'use client';

import { useState, useTransition } from 'react';
import { LinearProgress, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslations } from 'next-intl';
import { uploadThumbnail } from 'lib/services/data-upload/thumbnailUploadAction';
import FileUploadForm from './FileUploadForm';

export interface ThumbnailUploadProps {
    aasId: string;
    aasRepoUrl: string;
    onUploadSuccess?: () => void;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

/**
 * Thumbnail upload component for adding images to AAS.
 *
 * Allows users to select and upload thumbnail images for their Asset Administration Shell.
 * Validates file type and size before upload.
 */
export default function ThumbnailUpload(props: ThumbnailUploadProps) {
    const { aasId, aasRepoUrl, onUploadSuccess } = props;
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isPending, startThumbnailTransition] = useTransition();
    const t = useTranslations('pages.uploadData');

    const MAX_THUMBNAIL_SIZE_MB = 5;
    const ACCEPTABLE_FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ACCEPTABLE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    function translateBackendError(errorText: string | null | undefined): string | null {
        if (!errorText) return null;

        // Check if it's a translation key with parameters (format: "key|{json}")
        if (errorText.includes('|')) {
            const [key, paramsJson] = errorText.split('|');
            const translationKey = key.replace('pages.uploadData.thumbnail.', '');
            try {
                const params = JSON.parse(paramsJson);
                try {
                    // @ts-expect-error - Dynamic translation key, fallback handles invalid keys
                    return t(`thumbnail.${translationKey}`, params);
                } catch {
                    return errorText;
                }
            } catch {
                try {
                    // @ts-expect-error - Dynamic translation key, fallback handles invalid keys
                    return t(`thumbnail.${translationKey}`);
                } catch {
                    return errorText;
                }
            }
        }

        // Check if it's a simple translation key
        if (errorText.startsWith('pages.uploadData.thumbnail.')) {
            const translationKey = errorText.replace('pages.uploadData.thumbnail.', '');
            try {
                // @ts-expect-error - Dynamic translation key, fallback handles invalid keys
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

        const formData = new FormData();
        formData.append('thumbnail', file);

        startThumbnailTransition(async () => {
            try {
                const response = await uploadThumbnail(aasRepoUrl, aasId, formData);

                if (!response.isSuccess) {
                    const errorMessage = translateBackendError(response.message) || t('thumbnail.uploadError');
                    setErrorMessage(errorMessage);
                    setUploadStatus('error');
                    return;
                }

                setUploadStatus('success');
                if (onUploadSuccess) {
                    onUploadSuccess();
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : t('thumbnail.uploadError');
                setErrorMessage(errorMessage);
                setUploadStatus('error');
            }
        });
    }

    return (
        <Stack spacing={2}>
            <Typography variant="h6" fontWeight={600}>
                {t('thumbnail.sectionTitle')}
            </Typography>
            {uploadStatus === 'idle' && (
                <FileUploadForm
                    onSubmit={handleFileSubmit}
                    maxFileSizeMB={MAX_THUMBNAIL_SIZE_MB}
                    acceptableExtensions={ACCEPTABLE_FILE_EXTENSIONS}
                    acceptableMimeTypes={ACCEPTABLE_MIME_TYPES}
                    disabled={isPending}
                />
            )}
            {selectedFile &&
                (uploadStatus === 'uploading' || uploadStatus === 'success' || uploadStatus === 'error') && (
                    <Stack
                        spacing={2}
                        border="1px solid"
                        borderColor="divider"
                        borderRadius={2}
                        padding={2}
                        bgcolor="background.paper"
                        aria-live="polite"
                        role="status"
                    >
                        <Typography variant="body2" fontWeight={600} noWrap title={selectedFile.name}>
                            {selectedFile.name}
                        </Typography>
                        <Stack spacing={1}>
                            <Typography
                                variant="caption"
                                color={
                                    uploadStatus === 'success'
                                        ? 'success.main'
                                        : uploadStatus === 'error'
                                          ? 'error'
                                          : 'text.primary'
                                }
                                fontWeight={uploadStatus === 'success' || uploadStatus === 'error' ? 600 : 400}
                            >
                                {uploadStatus === 'uploading'
                                    ? t('thumbnail.uploading')
                                    : uploadStatus === 'success'
                                      ? t('thumbnail.uploadSuccess')
                                      : errorMessage}
                            </Typography>
                            {uploadStatus !== 'error' && (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <LinearProgress
                                        variant={uploadStatus === 'uploading' ? 'indeterminate' : 'determinate'}
                                        value={100}
                                        color="success"
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            width: '100px',
                                        }}
                                    />
                                    {uploadStatus === 'success' && (
                                        <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                                    )}
                                </Stack>
                            )}
                        </Stack>
                    </Stack>
                )}
        </Stack>
    );
}
