'use client';
import { Box, Link, List, ListItem, ListItemText, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

const SUBMODEL_LINKS = [
    {
        name: 'Digital Nameplate',
        url: 'https://github.com/admin-shell-io/submodel-templates/tree/main/published/Digital%20nameplate/3/0',
    },
    {
        name: 'HandoverDocumentation',
        url: 'https://github.com/admin-shell-io/submodel-templates/tree/main/published/Handover%20Documentation/2/0',
    },
    {
        name: 'Hierarchical Structures',
        url: 'https://github.com/admin-shell-io/submodel-templates/tree/main/published/Hierarchical%20Structures%20enabling%20Bills%20of%20Material',
    },
    {
        name: 'Material Composition',
        url: 'https://github.com/admin-shell-io/submodel-templates/tree/main/published/Digital%20Battery%20Passport/6_Material%20Composition/1/0',
    },
    {
        name: 'Circularity',
        url: 'https://github.com/admin-shell-io/submodel-templates/tree/main/published/Digital%20Battery%20Passport/7_Circularity/1/0',
    },
    {
        name: 'Product Carbon Footprint',
        url: 'https://github.com/admin-shell-io/submodel-templates/tree/main/published/Carbon%20Footprint/1/0',
    },
];

const PCF_CATENA_X_LINK = {
    name: 'urn:samm:io.catenax.pcf:9.0.0',
    url: 'https://github.com/eclipse-tractusx/sldt-semantic-models/tree/main/io.catenax.pcf/9.0.0',
};

const KBL_HARNESS_LINK = {
    name: 'Harness',
    url: 'https://ecad-wiki.prostep.org/specifications/kbl/v25-sr1/classes/harness/',
};

const KBL_PART_LINK = {
    name: 'Part',
    url: 'https://ecad-wiki.prostep.org/specifications/kbl/v25-sr1/classes/part/',
};

const VEC_PART_VERSION_LINK = {
    name: 'PartVersion',
    url: 'https://ecad-wiki.prostep.org/specifications/vec/v220/classes/partversion/',
};

export function UploadExplainer() {
    const t = useTranslations('pages.uploadData.explanation');

    function renderExternalLink(name: string, url: string) {
        return (
            <Link href={url} target="_blank" rel="noopener noreferrer">
                {name}
            </Link>
        );
    }

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                {t('title')}
            </Typography>

            {/* Step 1 */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                1. {t('step1Intro')}
            </Typography>
            <List dense disablePadding sx={{ pl: 2, mb: 1 }}>
                {SUBMODEL_LINKS.map((link, index) => (
                    <ListItem key={link.name} disableGutters sx={{ py: 0 }}>
                        <ListItemText
                            primary={
                                <Typography variant="body2" color="text.secondary">
                                    {'\u2022 '}
                                    {renderExternalLink(link.name, link.url)}
                                    {index === SUBMODEL_LINKS.length - 1 && (
                                        <>
                                            {' '}
                                            {t('step1PcfSuffix')}{' '}
                                            {renderExternalLink(PCF_CATENA_X_LINK.name, PCF_CATENA_X_LINK.url)}
                                        </>
                                    )}
                                </Typography>
                            }
                        />
                    </ListItem>
                ))}
            </List>

            {/* Step 2 */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                2. {t('step2Intro')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                {t('step2KblPrefix')} {renderExternalLink(KBL_HARNESS_LINK.name, KBL_HARNESS_LINK.url)}
                {' & '}
                {renderExternalLink(KBL_PART_LINK.name, KBL_PART_LINK.url)}
                {', '}
                {t('step2KblSuffix')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                {t('step2VecPrefix')} {renderExternalLink(VEC_PART_VERSION_LINK.name, VEC_PART_VERSION_LINK.url)}{' '}
                {t('step2VecSuffix')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, pl: 2 }}>
                {t('step2Closing')}
            </Typography>

            {/* Step 3 */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                3. {t('step3')}
            </Typography>

            {/* Step 4 */}
            <Typography variant="body2" color="text.secondary">
                4. {t('step4')}
            </Typography>
        </Box>
    );
}
