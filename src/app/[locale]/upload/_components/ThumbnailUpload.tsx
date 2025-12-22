'use client';

import { ChangeEvent, useId, useRef, useState, useTransition } from 'react';
import { Button, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { uploadThumbnail } from 'lib/services/data-upload/thumbnailUploadAction';
import CancelIcon from '@mui/icons-material/Cancel';

export interface ThumbnailUploadProps {
    aasId: string;
    aasRepoUrl: string;
    onUploadSuccess?: () => void;
}

/**
 * Thumbnail upload component for adding images to AAS.
 *
 * Allows users to select and upload thumbnail images for their Asset Administration Shell.
 * Validates file type and size before upload.
 */
export default function ThumbnailUpload(props: ThumbnailUploadProps) {
    const { aasId, aasRepoUrl, onUploadSuccess } = props;
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailUploadStatus, setThumbnailUploadStatus] = useState<
        'idle' | 'uploading' | 'success' | 'error'
    >('idle');
    const [thumbnailError, setThumbnailError] = useState<string | null>(null);
    const [isThumbnailPending, startThumbnailTransition] = useTransition();
    const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
    const t = useTranslations('pages.uploadData');
    const componentId = useId();
    const thumbnailInputId = `${componentId}-thumbnail-input`;

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

    function handleThumbnailSelection(event: ChangeEvent<HTMLInputElement>) {
        const { files } = event.target;
        if (!files || files.length === 0) {
            return;
        }
        const file = files[0];

        // Validate file type
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validImageTypes.includes(file.type)) {
            setThumbnailError(t('thumbnail.invalidFileType'));
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            setThumbnailError(t('thumbnail.fileTooLarge', { maxSize: formatFileSize(maxSize) }));
            return;
        }

        setThumbnailFile(file);
        setThumbnailError(null);
    }

    function handleThumbnailBrowseClick() {
        if (thumbnailInputRef.current) {
            thumbnailInputRef.current.click();
        }
    }

    function handleThumbnailUpload() {
        if (!thumbnailFile || !aasId) {
            return;
        }

        setThumbnailUploadStatus('uploading');
        setThumbnailError(null);

        const formData = new FormData();
        formData.append('thumbnail', thumbnailFile);

        startThumbnailTransition(async () => {
            try {
                const response = await uploadThumbnail(aasRepoUrl, aasId, formData);

                if (!response.isSuccess) {
                    const errorMessage = translateBackendError(response.message) || t('thumbnail.uploadError');
                    setThumbnailError(errorMessage);
                    setThumbnailUploadStatus('error');
                    return;
                }

                setThumbnailUploadStatus('success');
                if (onUploadSuccess) {
                    onUploadSuccess();
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : t('thumbnail.uploadError');
                setThumbnailError(errorMessage);
                setThumbnailUploadStatus('error');
            }
        });
    }

    function removeThumbnailFile() {
        setThumbnailFile(null);
        setThumbnailError(null);
        setThumbnailUploadStatus('idle');
        if (thumbnailInputRef.current) {
            thumbnailInputRef.current.value = '';
        }
    }

    return (
        <Stack spacing={2}>
            <Typography variant="h6" fontWeight={600}>
                {t('thumbnail.sectionTitle')}
            </Typography>
            <Stack
                spacing={2}
                border="1px solid"
                borderColor="divider"
                borderRadius={2}
                padding={2}
                bgcolor="background.paper"
            >
                <Typography variant="caption" color="text.secondary">
                    {t('thumbnail.description')}
                </Typography>
                <input
                    id={thumbnailInputId}
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleThumbnailSelection}
                    hidden
                />
                {!thumbnailFile && thumbnailUploadStatus === 'idle' && (
                    <Button variant="contained" onClick={handleThumbnailBrowseClick} sx={{ width: '50%' }}>
                        {t('thumbnail.selectFile')}
                    </Button>
                )}
                {thumbnailFile && thumbnailUploadStatus === 'idle' && (
                    <Stack spacing={1}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="body2" noWrap title={thumbnailFile.name}>
                                {thumbnailFile.name}
                            </Typography>
                            <IconButton size="small" onClick={removeThumbnailFile}>
                                <CancelIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            {formatFileSize(thumbnailFile.size)}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <Button variant="contained" onClick={handleThumbnailUpload} disabled={isThumbnailPending}>
                                {t('thumbnail.upload')}
                            </Button>
                        </Stack>
                    </Stack>
                )}
                {thumbnailUploadStatus === 'uploading' && (
                    <Stack spacing={1}>
                        <Typography variant="body2">{t('thumbnail.uploading')}</Typography>
                        <LinearProgress />
                    </Stack>
                )}
                {thumbnailUploadStatus === 'success' && (
                    <Typography variant="body2" color="success.main" fontWeight={600}>
                        {t('thumbnail.uploadSuccess')}
                    </Typography>
                )}
                {thumbnailError && (
                    <Typography variant="body2" color="error">
                        {thumbnailError}
                    </Typography>
                )}
            </Stack>
        </Stack>
    );
}
