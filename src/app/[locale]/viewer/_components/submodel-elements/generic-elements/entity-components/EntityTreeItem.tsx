import * as React from 'react';
import { TreeItemRoot } from '@mui/x-tree-view';
import { Box, Button, IconButton } from '@mui/material';
import { Entity, KeyTypes, RelationshipElement, SubmodelElementChoice } from 'lib/api/aas/models';
import { AssetIcon } from 'components/custom-icons/AssetIcon';
import { ArrowForward, ArticleOutlined, InfoOutlined, PinDropOutlined } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { GenericSubmodelElementComponent } from '../GenericSubmodelElementComponent';
import { EntityDetailsDialog } from './EntityDetailsDialog';
import { RelationShipDetailsDialog } from './RelationShipDetailsDialog';
import { ExpandableTreeitem } from 'app/[locale]/viewer/_components/submodel-elements/generic-elements/entity-components/TreeItem';
import { useTranslations, useLocale } from 'next-intl';
import { searchInAllDiscoveries } from 'lib/services/discovery-service/discoveryActions';
import { TreeItemCheckbox, TreeItemGroupTransition, TreeItemIconContainer } from '@mui/x-tree-view/TreeItem';
import { TreeItemIcon } from '@mui/x-tree-view/TreeItemIcon';
import { TreeItemProvider } from '@mui/x-tree-view/TreeItemProvider';
import { CustomTreeItemContent } from '../../../submodel/bill-of-applications/visualization-components/ApplicationTreeItem';
import { useTreeItem, UseTreeItemParameters } from '@mui/x-tree-view/useTreeItem';

interface EntityTreeItemProps
    extends Omit<UseTreeItemParameters, 'rootRef'>, Omit<React.HTMLAttributes<HTMLLIElement>, 'onFocus'> {
    applicationUrl?: string;
    data?: SubmodelElementChoice;
}

const CustomContent = React.forwardRef(function CustomContent(
    props: EntityTreeItemProps,
    ref: React.Ref<HTMLLIElement>,
) {
    const t = useTranslations('pages.aasViewer.submodels');
    const locale = useLocale();
    const navigate = useRouter();
    const { id, label, itemId, children, data, disabled, ...other } = props;
    const {
        getRootProps,
        getContentProps,
        getIconContainerProps,
        getCheckboxProps,

        getGroupTransitionProps,
        status,
    } = useTreeItem({ id, itemId, children, label, disabled, rootRef: ref });

    const isEntity = data?.modelType === KeyTypes.Entity;
    const dataIcon = isEntity ? (
        <AssetIcon fontSize="small" color="primary" />
    ) : (
        <ArticleOutlined fontSize="small" color="primary" />
    );
    const isRelationShip = data?.modelType === KeyTypes.RelationshipElement;
    const assetId = isEntity ? data.globalAssetId : undefined;
    const showDataDirectly = [KeyTypes.Property, KeyTypes.MultiLanguageProperty].find((mt) => mt === data?.modelType);
    const [detailsModalOpen, setDetailsModalOpen] = React.useState(false);

    const handleAssetNavigateClick = async (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        event.stopPropagation();
        if (!assetId) return;

        // Open a tab synchronously to avoid popup blockers. We avoid passing
        // `noopener,noreferrer` as some browsers then return `null` even when a
        // tab is opened; instead null out `opener` manually to prevent reverse-tabnabbing.
        const popup = typeof window !== 'undefined' ? window.open('', '_blank') : null;
        try {
            if (popup) popup.opener = null;
        } catch {
            // ignore
        }

        const { isSuccess, result: discoverySearchResult } = await searchInAllDiscoveries(assetId);

        const hasDiscovery = isSuccess && discoverySearchResult.length > 0;

        if (hasDiscovery) {
            const prefix = locale ? `/${locale}` : '';
            const assetPath = `${prefix}/asset?assetId=${encodeURIComponent(assetId)}`;
            if (popup) {
                try {
                    popup.location.href = assetPath;
                } catch {
                    window.location.href = assetPath;
                }
            } else {
                navigate.push(assetPath);
            }
        } else {
            // No local discovery - navigate directly to the assetId (might be external URL)
            if (popup) {
                try {
                    popup.location.href = assetId;
                } catch {
                    window.location.href = assetId;
                }
            } else {
                navigate.push(assetId);
            }
        }
    };

    const handleDetailsClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        event.stopPropagation();
        setDetailsModalOpen(true);
    };

    const handleDetailsModalClose = () => {
        setDetailsModalOpen(false);
    };

    return (
        <TreeItemProvider itemId={itemId} id={id}>
            <TreeItemRoot {...getRootProps(other)}>
                <CustomTreeItemContent {...getContentProps()}>
                    <TreeItemIconContainer {...getIconContainerProps()}>
                        <TreeItemIcon status={status} />
                    </TreeItemIconContainer>
                    <TreeItemCheckbox {...getCheckboxProps()} />
                    <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }} data-testid="bom-entity">
                        <ExpandableTreeitem dataIcon={dataIcon} itemId={itemId} label={label} {...other} />
                        <Box sx={{ ml: 'auto', pl: 1, display: 'flex' }}>
                            {assetId && !showDataDirectly && (
                                <>
                                    <IconButton sx={{ mr: 1 }} onClick={handleDetailsClick}>
                                        <InfoOutlined data-testid="entity-info-icon" sx={{ color: 'text.secondary' }} />
                                    </IconButton>
                                    <Button
                                        endIcon={<ArrowForward />}
                                        size="small"
                                        onClick={handleAssetNavigateClick}
                                        data-testid="view-asset-button"
                                    >
                                        {t('actions.view')}
                                    </Button>
                                </>
                            )}
                            {showDataDirectly && (
                                <GenericSubmodelElementComponent submodelElement={data} wrapInDataRow={false} />
                            )}
                        </Box>
                        {isRelationShip && (
                            <Box sx={{ ml: '2px', pl: 1, display: 'flex' }}>
                                <>
                                    <IconButton sx={{ mr: 1 }} onClick={handleDetailsClick}>
                                        <PinDropOutlined
                                            data-testid="entity-info-icon"
                                            sx={{ color: 'text.secondary' }}
                                        />
                                    </IconButton>
                                </>
                            </Box>
                        )}
                    </Box>
                </CustomTreeItemContent>
                {children && <TreeItemGroupTransition {...getGroupTransitionProps()} />}
            </TreeItemRoot>

            {isEntity && (
                <EntityDetailsDialog
                    open={detailsModalOpen}
                    handleClose={handleDetailsModalClose}
                    entity={props.data as Entity}
                />
            )}
            {isRelationShip && (
                <RelationShipDetailsDialog
                    open={detailsModalOpen}
                    handleClose={handleDetailsModalClose}
                    relationship={props.data as RelationshipElement}
                />
            )}
        </TreeItemProvider>
    );
});

export const EntityTreeItem = (props: EntityTreeItemProps) => {
    return <CustomContent {...props} />;
};
