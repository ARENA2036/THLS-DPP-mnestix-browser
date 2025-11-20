import { Box, Paper } from '@mui/material';
import { ViewHeading } from 'components/basics/ViewHeading';
import { useTranslations } from 'next-intl';
import DataUpload from './_components/DataUpload';

/**
 * Page presenting the data upload workflow.
 */
export default function UploadPage() {
    const t = useTranslations('pages.uploadData');

    return (
        <Box sx={{ p: 4, width: '100%', margin: '0 auto' }}>
            <Box>
                <ViewHeading title={t('title')} />
            </Box>
            <Paper sx={{ p: 4, mt: 3 }}>
                <Box sx={{ maxWidth: 600 }}>
                    <DataUpload />
                </Box>
            </Paper>
        </Box>
    );
}