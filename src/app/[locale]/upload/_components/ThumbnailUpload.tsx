'use client';

import { useId, useRef, useState, useTransition } from 'react';
import { Button, LinearProgress, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslations } from 'next-intl';
import { uploadThumbnail } from 'lib/services/data-upload/thumbnailUploadAction';
import DragAndDrop from './DragAndDrop';

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
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const t = useTranslations('pages.uploadData');
    const componentId = useId();
    const fileInputId = `${componentId}-thumbnail-input`;
    const helpTextId = `${componentId}-help`;
    const errorTextId = `${componentId}-error`;

    const MAX_THUMBNAIL_SIZE_MB = 5;
    const ACCEPTABLE_FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];


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

    function handleThumbnailSelection(file: File) {
        // Validate file type
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validImageTypes.includes(file.type)) {
            setThumbnailError(t('thumbnail.invalidFileType'));
            setThumbnailFile(null);
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = MAX_THUMBNAIL_SIZE_MB * 1024 * 1024;
        if (file.size > maxSize) {
            setThumbnailError(t('thumbnail.fileTooLarge', { maxSize: formatFileSize(maxSize) }));
            setThumbnailFile(null);
            return;
        }

        setThumbnailFile(file);
        setThumbnailError(null);
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
        handleThumbnailSelection(files[0]);
    }

    function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
        const { files } = event.target;
        if (!files || files.length === 0) {
            return;
        }
        handleThumbnailSelection(files[0]);
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
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
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
                {thumbnailUploadStatus !== 'success' && (
                    <Typography variant="caption" color="text.secondary">
                        {t('thumbnail.description')}
                    </Typography>
                )}
                {thumbnailUploadStatus === 'success' && thumbnailFile && (
                    <Typography variant="body2" fontWeight={600} noWrap title={thumbnailFile.name}>
                        {thumbnailFile.name}
                    </Typography>
                )}
                <input
                    id={fileInputId}
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleInputChange}
                    hidden
                />
                {thumbnailUploadStatus === 'idle' && (
                    <DragAndDrop
                        onBrowse={handleBrowseClick}
                        onDropFiles={handleFilesDropped}
                        helpTextId={helpTextId}
                        errorTextId={errorTextId}
                        hasError={Boolean(thumbnailError)}
                        selectedFile={thumbnailFile}
                        onDeleteFile={removeThumbnailFile}
                        formatFileSize={formatFileSize}
                        supportedFileTypes={ACCEPTABLE_FILE_EXTENSIONS.join(', ')}
                        maxSizeMB={MAX_THUMBNAIL_SIZE_MB}
                    />
                )}
                {thumbnailFile && thumbnailUploadStatus === 'idle' && (
                    <Button variant="contained" onClick={handleThumbnailUpload} disabled={isThumbnailPending}>
                        {t('thumbnail.upload')}
                    </Button>
                )}
                {(thumbnailUploadStatus === 'uploading' || thumbnailUploadStatus === 'success') && (
                    <Stack spacing={1}>
                        <Typography variant="caption" color={thumbnailUploadStatus === 'success' ? 'success.main' : 'text.primary'} fontWeight={thumbnailUploadStatus === 'success' ? 600 : 400}>
                            {thumbnailUploadStatus === 'uploading' ? t('thumbnail.uploading') : t('thumbnail.uploadSuccess')}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <LinearProgress
                                variant={thumbnailUploadStatus === 'uploading' ? 'indeterminate' : 'determinate'}
                                value={100}
                                color="success"
                                sx={{
                                    height: 6,
                                    borderRadius: 3,
                                    width: '100px',
                                }}
                            />
                            {thumbnailUploadStatus === 'success' && (
                                <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                            )}
                        </Stack>
                    </Stack>
                )}
                {thumbnailError && thumbnailUploadStatus === 'idle' && (
                    <Typography id={errorTextId} variant="caption" color="error" role="alert" aria-live="assertive">
                        {thumbnailError}
                    </Typography>
                )}
            </Stack>
        </Stack>
    );
}
