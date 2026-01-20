'use client';

import { useState, useRef, useTransition, ChangeEvent } from 'react';
import { Button, Stack, Typography, Alert } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useLocale, useTranslations } from 'next-intl';
import { AdditionalDocument } from 'lib/services/data-upload/additionalDocumentTypes';
import { getVdi2770ClassName } from 'lib/services/data-upload/vdi2770Constants';
import { uploadAdditionalDocuments } from 'lib/services/data-upload/additionalDocumentUploadAction';
import AdditionalDocumentList from './AdditionalDocumentList';
import DragAndDrop from './DragAndDrop';

export interface StepAdditionalDocumentsProps {
    /** ID of the HandoverDocumentation submodel */
    submodelId: string;
    /** URL of the submodel repository */
    repositoryUrl: string;
    /** Organization name from VEC/KBL for document metadata */
    organizationName: string;
    /** Starting index for document naming (accounts for existing documents) */
    startIndex: number;
    /** Callback when user wants to skip this step */
    onSkip: () => void;
    /** Callback when all documents are uploaded */
    onComplete: () => void;
    /** Whether the step is disabled */
    disabled?: boolean;
}

/**
 * Step 4: Additional Documents
 * Allows users to upload multiple additional documents with VDI 2770 classification.
 * This step is optional - users can skip it.
 */
export default function StepAdditionalDocuments(props: StepAdditionalDocumentsProps) {
    const { submodelId, repositoryUrl, organizationName, startIndex, onSkip, onComplete, disabled = false } = props;

    const [documents, setDocuments] = useState<AdditionalDocument[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const t = useTranslations('pages.uploadData');
    const locale = useLocale();

    const MAX_FILE_SIZE_MB = 10;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

    const pendingDocuments = documents.filter((d) => d.uploadStatus === 'pending');
    const uploadedDocuments = documents.filter((d) => d.uploadStatus === 'success');
    const allUploaded = documents.length > 0 && pendingDocuments.length === 0;

    function generateDocumentId(): string {
        return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    function addFiles(files: FileList | File[]) {
        const newDocuments: AdditionalDocument[] = [];

        Array.from(files).forEach((file) => {
            // Validate file size
            if (file.size > MAX_FILE_SIZE_BYTES) {
                setUploadError(t('fileTooLarge', { maxSize: `${MAX_FILE_SIZE_MB} MB` }));
                return;
            }

            // Default to first document class
            const defaultClassId = '02-01';
            const defaultClassName = getVdi2770ClassName(defaultClassId, locale);

            newDocuments.push({
                id: generateDocumentId(),
                file,
                title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension for title
                description: '',
                classId: defaultClassId,
                className: defaultClassName,
                uploadStatus: 'pending',
            });
        });

        if (newDocuments.length > 0) {
            setDocuments((prev) => [...prev, ...newDocuments]);
            setUploadError(null);
        }
    }

    function handleFilesDropped(files: FileList) {
        addFiles(files);
    }

    function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        const { files } = event.target;
        if (files && files.length > 0) {
            addFiles(files);
        }
        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    function handleBrowseClick() {
        fileInputRef.current?.click();
    }

    function handleUpdateDocument(id: string, updates: Partial<AdditionalDocument>) {
        setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, ...updates } : doc)));
    }

    function handleRemoveDocument(id: string) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    }

    function handleUploadAll() {
        if (pendingDocuments.length === 0) return;

        setIsUploading(true);
        setUploadError(null);

        // Mark all pending as uploading
        setDocuments((prev) =>
            prev.map((doc) => (doc.uploadStatus === 'pending' ? { ...doc, uploadStatus: 'uploading' } : doc)),
        );

        startTransition(async () => {
            try {
                // Build FormData with all pending documents
                const formData = new FormData();
                pendingDocuments.forEach((doc) => {
                    formData.append('files', doc.file);
                    formData.append('titles', doc.title);
                    formData.append('descriptions', doc.description);
                    formData.append('classIds', doc.classId);
                    formData.append('classNames', doc.className);
                });
                formData.append('organizationName', organizationName);

                const result = await uploadAdditionalDocuments(
                    submodelId,
                    repositoryUrl,
                    formData,
                    startIndex + uploadedDocuments.length,
                    locale,
                );

                if (!result.isSuccess) {
                    setUploadError(result.message || t('additionalDocs.uploadError'));
                    // Mark all uploading as error
                    setDocuments((prev) =>
                        prev.map((doc) =>
                            doc.uploadStatus === 'uploading'
                                ? { ...doc, uploadStatus: 'error', errorMessage: result.message }
                                : doc,
                        ),
                    );
                } else {
                    // Update document statuses based on results
                    setDocuments((prev) => {
                        const uploadingDocs = prev.filter((d) => d.uploadStatus === 'uploading');
                        return prev.map((doc) => {
                            if (doc.uploadStatus !== 'uploading') return doc;
                            const index = uploadingDocs.findIndex((d) => d.id === doc.id);
                            const resultItem = result.result?.results[index];
                            if (resultItem) {
                                return {
                                    ...doc,
                                    uploadStatus: resultItem.success ? 'success' : 'error',
                                    errorMessage: resultItem.error,
                                };
                            }
                            return doc;
                        });
                    });
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : t('additionalDocs.uploadError');
                setUploadError(errorMsg);
                setDocuments((prev) =>
                    prev.map((doc) =>
                        doc.uploadStatus === 'uploading'
                            ? { ...doc, uploadStatus: 'error', errorMessage: errorMsg }
                            : doc,
                    ),
                );
            } finally {
                setIsUploading(false);
            }
        });
    }

    function handleContinue() {
        onComplete();
    }

    return (
        <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
                {t('additionalDocs.description')}
            </Typography>

            {/* Hidden file input for multi-select */}
            <input ref={fileInputRef} type="file" multiple onChange={handleInputChange} style={{ display: 'none' }} />

            {/* Drop zone - always visible when not all uploaded */}
            {!allUploaded && (
                <DragAndDrop
                    onBrowse={handleBrowseClick}
                    onDropFiles={handleFilesDropped}
                    helpTextId="additional-docs-help"
                    errorTextId="additional-docs-error"
                    hasError={false}
                    selectedFile={null}
                    onDeleteFile={() => {}}
                    supportedFileTypes={t('additionalDocs.supportedFiles')}
                    maxSizeMB={MAX_FILE_SIZE_MB}
                />
            )}

            {/* Error message */}
            {uploadError && (
                <Alert severity="error" onClose={() => setUploadError(null)}>
                    {uploadError}
                </Alert>
            )}

            {/* Document list */}
            {documents.length > 0 && (
                <AdditionalDocumentList
                    documents={documents}
                    onUpdateDocument={handleUpdateDocument}
                    onRemoveDocument={handleRemoveDocument}
                    disabled={disabled || isUploading}
                />
            )}

            {/* Status message */}
            {documents.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                    {allUploaded
                        ? t('additionalDocs.allUploaded')
                        : t('additionalDocs.pendingUploads', { count: pendingDocuments.length })}
                </Typography>
            )}

            {/* Action buttons */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
                {!allUploaded && (
                    <>
                        <Button variant="outlined" onClick={onSkip} disabled={disabled || isUploading}>
                            {t('additionalDocs.skip')}
                        </Button>
                        {pendingDocuments.length > 0 && (
                            <Button
                                variant="contained"
                                startIcon={<CloudUploadIcon />}
                                onClick={handleUploadAll}
                                disabled={disabled || isUploading || isPending}
                            >
                                {t('additionalDocs.uploadAll')}
                            </Button>
                        )}
                    </>
                )}
                {allUploaded && (
                    <Button variant="contained" onClick={handleContinue} disabled={disabled}>
                        {t('additionalDocs.continue')}
                    </Button>
                )}
            </Stack>
        </Stack>
    );
}
