'use client';
import { Box, Grid, Link, Paper, Typography } from '@mui/material';
import { ViewHeading } from 'components/basics/ViewHeading';
import { useTranslations } from 'next-intl';
import UploadWorkflowStepper from './_components/UploadWorkflowStepper';
import NextLink from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

/**
 * Page presenting the data upload workflow.
 * Uses a multi-step stepper process:
 * 1. Upload VEC/KBL file
 * 2. Process and generate AAS
 * 3. Upload thumbnail (required)
 * 4. Upload additional documents (optional, with VDI 2770 classification)
 * 5. Complete
 */
export default function UploadPage() {
    const t = useTranslations('pages.uploadData');

    return (
        <Box sx={{ p: 4, width: '100%', margin: '0 auto' }}>
            <Box sx={{ mb: 2 }}>
                <Link
                    component={NextLink}
                    href="/"
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        textDecoration: 'none',
                        color: 'primary.main',
                        '&:hover': {
                            textDecoration: 'underline',
                        },
                    }}
                >
                    <ArrowBackIcon fontSize="small" />
                    {t('backToHome')}
                </Link>
            </Box>
            <Box>
                <ViewHeading title={t('title')} />
            </Box>
            <Paper sx={{ p: 4, mt: 3 }}>
                <Grid container spacing={4}>
                    <Grid size={{ xs: 12, md: 7 }}>
                        <UploadWorkflowStepper />
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Typography variant="h6" gutterBottom>
                            {t('explanation.title')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            {t('explanation.paragraph1')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            {t('explanation.paragraph2')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {t('explanation.paragraph3')}
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
}
