import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import { DialogCloseButton } from 'components/basics/DialogCloseButton';
import { useTranslations } from 'next-intl';

type ExternalRedirectDialogProps = {
    readonly open: boolean;
    readonly handleClose: () => void;
    readonly url: string;
    readonly onConfirm: () => void;
};

export function ExternalRedirectDialog({ open, handleClose, url, onConfirm }: ExternalRedirectDialogProps) {
    const t = useTranslations('pages.aasViewer.submodels.externalRedirect');

    function handleConfirm() {
        onConfirm();
        handleClose();
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogCloseButton handleClose={handleClose} />
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogContent>
                <DialogContentText>{t('message', { url })}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="primary">
                    {t('cancel')}
                </Button>
                <Button onClick={handleConfirm} color="primary" variant="contained">
                    {t('confirm')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
