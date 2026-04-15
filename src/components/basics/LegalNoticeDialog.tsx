import { Box, Dialog, DialogContent, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { DialogCloseButton } from 'components/basics/DialogCloseButton';

type LegalNoticeDialogProps = {
    readonly onClose: () => void;
    readonly open: boolean;
};

export function LegalNoticeDialog(props: LegalNoticeDialogProps) {
    const t = useTranslations('navigation.footer');

    return (
        <Dialog open={props.open} onClose={props.onClose} maxWidth="md" fullWidth={true}>
            <DialogCloseButton handleClose={props.onClose} />
            <DialogContent style={{ padding: '40px' }}>
                <Box display="flex" flexDirection="column" gap="20px">
                    <Typography variant="h2" color="primary">
                        {t('legalNoticeTitle')}
                    </Typography>
                    <Box>
                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                            {t('legalNoticeText1')}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                            {t('legalNoticeText2')}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                            {t('legalNoticeText3')}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                            {t('legalNoticeText4')}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                            {t('legalNoticeText5')}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                            {t('legalNoticeText6')}
                        </Typography>
                        <Typography color="text.secondary">{t('legalNoticeText7')}</Typography>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
