'use client';

import { FormControl, InputLabel, ListSubheader, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { useLocale, useTranslations } from 'next-intl';
import { VDI2770_DOCUMENT_CLASSES, getVdi2770ClassName } from 'lib/services/data-upload/vdi2770Constants';

export interface Vdi2770ClassSelectorProps {
    /** Selected class ID */
    value: string;
    /** Callback when class is selected */
    onChange: (classId: string, className: string) => void;
    /** Whether the selector is disabled */
    disabled?: boolean;
    /** Size variant */
    size?: 'small' | 'medium';
    /** Full width */
    fullWidth?: boolean;
    /** Error state */
    error?: boolean;
    /** Helper text */
    helperText?: string;
}

/**
 * Dropdown selector for VDI 2770 document classification classes.
 * Groups classes by category (01-xx, 02-xx, 03-xx, 04-xx).
 */
export default function Vdi2770ClassSelector(props: Vdi2770ClassSelectorProps) {
    const { value, onChange, disabled = false, size = 'small', fullWidth = true, error = false } = props;

    const t = useTranslations('pages.uploadData');
    const locale = useLocale();

    // Group classes by their prefix
    const groupedClasses = {
        '01': VDI2770_DOCUMENT_CLASSES.filter((c) => c.classId.startsWith('01')),
        '02': VDI2770_DOCUMENT_CLASSES.filter((c) => c.classId.startsWith('02')),
        '03': VDI2770_DOCUMENT_CLASSES.filter((c) => c.classId.startsWith('03')),
        '04': VDI2770_DOCUMENT_CLASSES.filter((c) => c.classId.startsWith('04')),
    };

    const groupLabels: Record<string, string> = {
        '01': locale === 'de' ? 'Identifikation' : 'Identification',
        '02': locale === 'de' ? 'Technische Dokumentation' : 'Technical Documentation',
        '03': locale === 'de' ? 'Betriebsanleitung' : 'Operating Instructions',
        '04': locale === 'de' ? 'Vertragsdokumente' : 'Contract Documents',
    };

    function handleChange(event: SelectChangeEvent<string>) {
        const selectedClassId = event.target.value;
        const className = getVdi2770ClassName(selectedClassId, locale);
        onChange(selectedClassId, className);
    }

    function renderMenuItems() {
        const items: React.ReactNode[] = [];

        Object.entries(groupedClasses).forEach(([group, classes]) => {
            if (classes.length > 0) {
                items.push(
                    <ListSubheader
                        key={`header-${group}`}
                        sx={{ fontWeight: 600, backgroundColor: 'background.paper' }}
                    >
                        {groupLabels[group]}
                    </ListSubheader>,
                );

                classes.forEach((docClass) => {
                    const className = locale === 'de' ? docClass.classNameDe : docClass.classNameEn;
                    items.push(
                        <MenuItem key={docClass.classId} value={docClass.classId}>
                            {docClass.classId} - {className}
                        </MenuItem>,
                    );
                });
            }
        });

        return items;
    }

    return (
        <FormControl fullWidth={fullWidth} size={size} error={error} disabled={disabled}>
            <InputLabel id="vdi2770-class-label">{t('additionalDocs.classLabel')}</InputLabel>
            <Select
                labelId="vdi2770-class-label"
                id="vdi2770-class-select"
                value={value}
                label={t('additionalDocs.classLabel')}
                onChange={handleChange}
                data-testid="vdi2770-class-selector"
            >
                <MenuItem value="" disabled>
                    <em>{t('additionalDocs.selectClass')}</em>
                </MenuItem>
                {renderMenuItems()}
            </Select>
        </FormControl>
    );
}
