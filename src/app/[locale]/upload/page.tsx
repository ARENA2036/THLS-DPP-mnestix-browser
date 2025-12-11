'use client';
import { Box, Grid, Link, Paper, Typography } from '@mui/material';
import { ViewHeading } from 'components/basics/ViewHeading';
import { useTranslations } from 'next-intl';
import DataUpload from './_components/DataUpload';
import NextLink from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

/**
 * Page presenting the data upload workflow.
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
                    <Grid size={{ xs:12, md:6 }}>
                        <DataUpload />
                    </Grid>
                    <Grid size={{ xs:12, md:6 }}>
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
