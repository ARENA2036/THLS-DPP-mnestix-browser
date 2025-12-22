'use client';

import DescriptionIcon from '@mui/icons-material/Description';
import CancelIcon from '@mui/icons-material/Cancel';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DragEvent, KeyboardEvent, useState } from 'react';
import { useTranslations } from 'next-intl';

export interface DragAndDropProps {
    onBrowse: () => void;
    onDropFiles: (files: FileList) => void;
    helpTextId: string;
    errorTextId: string;
    hasError: boolean;
    selectedFile?: File | null;
    onDeleteFile?: () => void;
    formatFileSize?: (bytes: number) => string;
    supportedFileTypes?: string;
    maxSizeMB?: number;
}

/**
 * Drag-and-drop upload area tailored for the data upload workflow.
 * Can display a selected file with delete option.
 */
export default function DragAndDrop({
    onBrowse,
    onDropFiles,
    helpTextId,
    errorTextId,
    hasError,
    selectedFile,
    onDeleteFile,
    formatFileSize,
    supportedFileTypes,
    maxSizeMB,
}: DragAndDropProps) {
    const theme = useTheme();
    const t = useTranslations('pages.uploadData');
    const describedBy = hasError ? `${helpTextId} ${errorTextId}` : helpTextId;
    const [isDragActive, setIsDragActive] = useState(false);

    const defaultFormatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const value = bytes / Math.pow(k, i);
        return `${value >= 10 || i === 0 ? value.toFixed(0) : value.toFixed(1)} ${sizes[i]}`;
    };

    const fileSizeFormatter = formatFileSize || defaultFormatFileSize;

    function handleDragOver(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    function handleDragEnter(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setIsDragActive(true);
    }

    function handleDragLeave(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        const nextTarget = event.relatedTarget as Node | null;
        if (nextTarget && event.currentTarget.contains(nextTarget)) {
            return;
        }
        setIsDragActive(false);
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setIsDragActive(false);
        const { files } = event.dataTransfer;
        if (!files || files.length === 0) {
            return;
        }
        onDropFiles(files);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onBrowse();
        }
    }

    function handleClick() {
        // Only allow browsing if no file is selected
        if (!selectedFile) {
            onBrowse();
        }
    }

    function handleDeleteClick(event: React.MouseEvent) {
        event.stopPropagation();
        if (onDeleteFile) {
            onDeleteFile();
        }
    }

    return (
        <Box
            role="button"
            tabIndex={selectedFile ? -1 : 0}
            onKeyDown={!selectedFile ? handleKeyDown : undefined}
            onClick={handleClick}
            onDragOver={!selectedFile ? handleDragOver : undefined}
            onDragEnter={!selectedFile ? handleDragEnter : undefined}
            onDragLeave={!selectedFile ? handleDragLeave : undefined}
            onDrop={!selectedFile ? handleDrop : undefined}
            aria-describedby={describedBy}
            aria-label={selectedFile ? undefined : t('ariaLabel')}
            sx={{
                border: selectedFile ? '1px solid' : '2px dashed',
                borderColor: selectedFile ? 'divider' : isDragActive ? 'primary.main' : 'divider',
                borderRadius: 2,
                padding: selectedFile ? 2 : 4,
                textAlign: selectedFile ? 'left' : 'center',
                backgroundColor: selectedFile ? 'background.paper' : isDragActive ? 'action.hover' : 'background.paper',
                cursor: selectedFile ? 'default' : 'pointer',
                outline: 'none',
                transition: theme.transitions.create(['border-color', 'background-color', 'padding'], {
                    duration: theme.transitions.duration.shorter,
                }),
                '&:focus-visible': !selectedFile
                    ? {
                          borderColor: 'primary.main',
                          boxShadow: `0 0 0 4px ${theme.palette.action.focus}`,
                      }
                    : {},
            }}
        >
            {selectedFile ? (
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack spacing={0.5} flex={1}>
                        <Typography variant="body2" fontWeight={600} noWrap title={selectedFile.name}>
                            {selectedFile.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {fileSizeFormatter(selectedFile.size)}
                        </Typography>
                    </Stack>
                    {onDeleteFile && (
                        <IconButton
                            size="small"
                            aria-label={t('actions.deleteFile')}
                            onClick={handleDeleteClick}
                            color="error"
                        >
                            <CancelIcon fontSize="small" />
                        </IconButton>
                    )}
                </Stack>
            ) : (
                <Stack spacing={2} alignItems="center">
                    <DescriptionIcon color={isDragActive ? 'primary' : 'action'} fontSize="large" aria-hidden={true} />
                    <Stack spacing={0.5} alignItems="center" id={helpTextId}>
                        <Typography component="p" variant="body1">
                            <Typography
                                component="span"
                                color="primary"
                                sx={{
                                    textDecoration: 'underline',
                                    fontWeight: 600,
                                }}
                            >
                                {t('cta.clickToUpload')}
                            </Typography>{' '}
                            {t('cta.orDragAndDrop')}
                        </Typography>
                        <Typography component="p" variant="body2" color="text.secondary">
                           {t('cta.supportedFiles', { formats: supportedFileTypes || '', maxSize: maxSizeMB || '' })}
                        </Typography>
                    </Stack>
                </Stack>
            )}
        </Box>
    );
}
