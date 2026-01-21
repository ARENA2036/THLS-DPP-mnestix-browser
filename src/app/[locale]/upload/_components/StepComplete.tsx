'use client';

import { Button, Stack, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import { useTranslations } from 'next-intl';

export interface StepCompleteProps {
    /** URL to view the created DPP */
    redirectUrl: string;
    /** Callback to start a new DPP creation */
    onCreateAnother: () => void;
}

/**
 * Step 5: Complete
 * Shows success message and provides actions to view DPP or create another.
 */
export default function StepComplete(props: StepCompleteProps) {
    const { redirectUrl, onCreateAnother } = props;
    const t = useTranslations('pages.uploadData');

    return (
        <Stack spacing={3} alignItems="center" textAlign="center" py={2}>
            <Stack spacing={1}>
                <Typography variant="h5" fontWeight={600}>
                    {t('complete.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t('complete.message')}
                </Typography>
            </Stack>

            <Stack direction="row" spacing={2}>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<VisibilityIcon />}
                    href={redirectUrl}
                    size="large"
                >
                    {t('complete.viewDpp')}
                </Button>
                <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={onCreateAnother}
                    size="large"
                >
                    {t('complete.createAnother')}
                </Button>
            </Stack>
        </Stack>
    );
}
