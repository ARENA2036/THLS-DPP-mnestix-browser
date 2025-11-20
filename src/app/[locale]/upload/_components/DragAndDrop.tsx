'use client';

import DescriptionIcon from '@mui/icons-material/Description';
import { Box, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DragEvent, KeyboardEvent, useState } from 'react';
import { useTranslations } from 'next-intl';

export interface DragAndDropProps {
    onBrowse: () => void;
    onDropFiles: (files: FileList) => void;
    helpTextId: string;
    errorTextId: string;
    hasError: boolean;
}

/**
 * Drag-and-drop upload area tailored for the data upload workflow.
 */
export default function DragAndDrop({
    onBrowse,
    onDropFiles,
    helpTextId,
    errorTextId,
    hasError,
}: DragAndDropProps) {
    const theme = useTheme();
    const t = useTranslations('pages.uploadData');
    const describedBy = hasError ? `${helpTextId} ${errorTextId}` : helpTextId;
    const [isDragActive, setIsDragActive] = useState(false);

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
        onBrowse();
    }
    return (
        <Box
            role="button"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            aria-describedby={describedBy}
            aria-label={t('ariaLabel')}
            sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'divider',
                borderRadius: 2,
                padding: 4,
                textAlign: 'center',
                backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
                cursor: 'pointer',
                outline: 'none',
                transition: theme.transitions.create(['border-color', 'background-color'], {
                    duration: theme.transitions.duration.shorter,
                }),
                '&:focus-visible': {
                    borderColor: 'primary.main',
                    boxShadow: `0 0 0 4px ${theme.palette.action.focus}`,
                },
            }}
        >
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
                        {t('descriptions.supportedFormats')}
                    </Typography>
                </Stack>
            </Stack>
        </Box>
    );
}
