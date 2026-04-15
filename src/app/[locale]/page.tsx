'use client';

import { Box, Card, CardActionArea, Grid, Link, Typography } from '@mui/material';
import { GoToListCard } from 'app/[locale]/_components/GoToListCard';
import { UploadCard } from 'app/[locale]/_components/UploadCard';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEnv } from 'app/EnvProvider';

export default function () {
    const t = useTranslations('pages.dashboard');
    const navigate = useRouter();
    const env = useEnv();

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: '90vh' }}>
            <Box sx={{ maxWidth: 1000, textAlign: 'left', p: 2 }}>
                <Box sx={{ mb: 2 }}>
                    <Typography data-testid="welcome-text" variant="h1" color="primary" sx={{ mt: 3, mb: 2 }}>
                        {t('welcomeText')}
                    </Typography>
                    <Typography variant="h3">{t('digitalTwinMadeEasyText')}</Typography>
                </Box>

                <Grid container spacing={2} alignItems="stretch">
                    <Grid size={{ md: 6, xs: 12 }}>
                        <Card sx={{ height: '100%', borderRadius: '12px' }}>
                            <CardActionArea
                                onClick={() => navigate.push('/upload')}
                                aria-label={t('uploadCardHeader')}
                                sx={{ height: '100%', display: 'flex', alignItems: 'stretch' }}
                            >
                                <UploadCard />
                            </CardActionArea>
                        </Card>
                    </Grid>
                    {env.AAS_LIST_FEATURE_FLAG && (
                        <Grid size={{ md: 6, xs: 12 }}>
                            <Card sx={{ height: '100%', borderRadius: '12px' }}>
                                <CardActionArea
                                    onClick={() => navigate.push('/list')}
                                    aria-label={t('listBtnText')}
                                    sx={{ height: '100%', display: 'flex', alignItems: 'stretch' }}
                                >
                                    <GoToListCard />
                                </CardActionArea>
                            </Card>
                        </Grid>
                    )}
                </Grid>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                    {t('infoText')}{' '}
                    <Link href={t('infoLink')} target="_blank" rel="noopener noreferrer">
                        {t('infoLinkText')}
                    </Link>
                </Typography>
            </Box>
        </Box>
    );
}
