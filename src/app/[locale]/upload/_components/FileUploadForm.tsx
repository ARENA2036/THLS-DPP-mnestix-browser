'use client';

import { ChangeEvent, useId, useRef, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import DragAndDrop from './DragAndDrop';
import { formatFileSize } from './DataUploadUtils';

export interface FileUploadFormProps {
    onSubmit: (file: File) => void;
    maxFileSizeMB: number;
    acceptableExtensions: string[];
    acceptableMimeTypes: string[];
    disabled?: boolean;
}

/**
 * File upload form component with drag-and-drop functionality.
 * Handles file selection, validation (type, size), and submission.
 */
export default function FileUploadForm(props: FileUploadFormProps) {
    const { onSubmit, maxFileSizeMB, acceptableExtensions, acceptableMimeTypes, disabled = false } = props;
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const t = useTranslations('pages.uploadData');
    const componentId = useId();
    const fileInputId = `${componentId}-input`;
    const helpTextId = `${componentId}-help`;
    const errorTextId = `${componentId}-error`;

    const maxFileSize = maxFileSizeMB * 1024 * 1024;
    const acceptableFileTypes = [...acceptableExtensions, ...acceptableMimeTypes].join(',');

    function isValidFile(file: File): boolean {
        const fileName = file.name.toLowerCase();
        const hasValidExtension = acceptableExtensions.some((extension) => fileName.endsWith(extension));
        const hasValidMimeType = acceptableMimeTypes.includes(file.type);

        return hasValidExtension || hasValidMimeType;
    }

    function handleFileSelection(file: File) {
        setErrorMessage(null);

        if (!isValidFile(file)) {
            const message = t('fileTypeNotSupported', { formats: acceptableExtensions.join(', ') });
            setErrorMessage(message);
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        if (file.size > maxFileSize) {
            const message = t('fileTooLarge', { maxSize: formatFileSize(maxFileSize) });
            setErrorMessage(message);
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        setSelectedFile(file);
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

    function clearSelectedFile() {
        setSelectedFile(null);
        setErrorMessage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    function handleSubmit() {
        if (!selectedFile) {
            setErrorMessage(t('form.errors.fileRequired'));
            return;
        }
        onSubmit(selectedFile);
    }

    return (
        <Stack spacing={2}>
            <input
                id={fileInputId}
                ref={fileInputRef}
                type="file"
                accept={acceptableFileTypes}
                onChange={handleInputChange}
                hidden
            />
            <DragAndDrop
                onBrowse={handleBrowseClick}
                onDropFiles={handleFilesDropped}
                helpTextId={helpTextId}
                errorTextId={errorTextId}
                hasError={Boolean(errorMessage)}
                selectedFile={selectedFile}
                onDeleteFile={clearSelectedFile}
                supportedFileTypes={acceptableExtensions.join(', ')}
                maxSizeMB={maxFileSizeMB}
            />
            <Button variant="contained" color="primary" onClick={handleSubmit} disabled={!selectedFile || disabled}>
                {t('form.submitLabel')}
            </Button>
            {errorMessage && (
                <Typography id={errorTextId} variant="body2" color="error" role="alert" aria-live="assertive">
                    {errorMessage}
                </Typography>
            )}
        </Stack>
    );
}
