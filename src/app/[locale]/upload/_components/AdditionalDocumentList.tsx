'use client';

import { Box, IconButton, Paper, Stack, TextField, Typography, Chip, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useTranslations } from 'next-intl';
import { AdditionalDocument } from 'lib/services/data-upload/additionalDocumentTypes';
import Vdi2770ClassSelector from './Vdi2770ClassSelector';
import { formatFileSize } from './DataUploadUtils';

export interface AdditionalDocumentListProps {
    /** List of documents */
    documents: AdditionalDocument[];
    /** Callback to update a document */
    onUpdateDocument: (id: string, updates: Partial<AdditionalDocument>) => void;
    /** Callback to remove a document */
    onRemoveDocument: (id: string) => void;
    /** Whether editing is disabled (during upload) */
    disabled?: boolean;
}

/**
 * Displays a list of additional documents with editable metadata fields.
 * Each document shows:
 * - File info (name, size)
 * - Editable title
 * - Editable description
 * - VDI 2770 class selector
 * - Upload status indicator
 * - Remove button
 */
export default function AdditionalDocumentList(props: AdditionalDocumentListProps) {
    const { documents, onUpdateDocument, onRemoveDocument, disabled = false } = props;
    const t = useTranslations('pages.uploadData');

    if (documents.length === 0) {
        return null;
    }

    function getStatusIcon(status: AdditionalDocument['uploadStatus']) {
        switch (status) {
            case 'uploading':
                return <CircularProgress size={20} />;
            case 'success':
                return <CheckCircleIcon color="success" />;
            case 'error':
                return <ErrorIcon color="error" />;
            default:
                return null;
        }
    }

    function getStatusChip(doc: AdditionalDocument) {
        switch (doc.uploadStatus) {
            case 'uploading':
                return <Chip label={t('additionalDocs.uploading')} size="small" color="info" />;
            case 'success':
                return <Chip label={t('additionalDocs.uploadSuccess')} size="small" color="success" />;
            case 'error':
                return <Chip label={doc.errorMessage || t('additionalDocs.uploadError')} size="small" color="error" />;
            default:
                return null;
        }
    }

    return (
        <Stack spacing={2}>
            {documents.map((doc) => (
                <Paper
                    key={doc.id}
                    variant="outlined"
                    sx={{
                        p: 2,
                        opacity: doc.uploadStatus === 'success' ? 0.7 : 1,
                        borderColor: doc.uploadStatus === 'error' ? 'error.main' : undefined,
                    }}
                >
                    <Stack spacing={2}>
                        {/* File info and status */}
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Box display="flex" alignItems="center" gap={1}>
                                <InsertDriveFileIcon color="action" />
                                <Box>
                                    <Typography variant="body2" fontWeight={500}>
                                        {doc.file.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {formatFileSize(doc.file.size)}
                                    </Typography>
                                </Box>
                                {getStatusIcon(doc.uploadStatus)}
                            </Box>
                            <Box display="flex" alignItems="center" gap={1}>
                                {getStatusChip(doc)}
                                {doc.uploadStatus !== 'success' && (
                                    <IconButton
                                        size="small"
                                        onClick={() => onRemoveDocument(doc.id)}
                                        disabled={disabled || doc.uploadStatus === 'uploading'}
                                        aria-label={t('additionalDocs.removeFile')}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                )}
                            </Box>
                        </Box>

                        {/* Editable fields - only show for pending documents */}
                        {doc.uploadStatus !== 'success' && (
                            <Stack spacing={2}>
                                <TextField
                                    label={t('additionalDocs.titleLabel')}
                                    value={doc.title}
                                    onChange={(e) => onUpdateDocument(doc.id, { title: e.target.value })}
                                    size="small"
                                    fullWidth
                                    disabled={disabled || doc.uploadStatus === 'uploading'}
                                />
                                <TextField
                                    label={t('additionalDocs.descriptionLabel')}
                                    value={doc.description}
                                    onChange={(e) => onUpdateDocument(doc.id, { description: e.target.value })}
                                    size="small"
                                    fullWidth
                                    multiline
                                    rows={2}
                                    disabled={disabled || doc.uploadStatus === 'uploading'}
                                />
                                <Vdi2770ClassSelector
                                    value={doc.classId}
                                    onChange={(classId, className) => onUpdateDocument(doc.id, { classId, className })}
                                    disabled={disabled || doc.uploadStatus === 'uploading'}
                                    size="small"
                                />
                            </Stack>
                        )}
                    </Stack>
                </Paper>
            ))}
        </Stack>
    );
}
