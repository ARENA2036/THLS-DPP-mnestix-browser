import * as React from 'react';
import { TreeItemRoot } from '@mui/x-tree-view';
import { Box, Button, IconButton } from '@mui/material';
import { Entity, KeyTypes, RelationshipElement, SubmodelElementChoice } from 'lib/api/aas/models';
import { AssetIcon } from 'components/custom-icons/AssetIcon';
import { ArrowForward, ArticleOutlined, InfoOutlined, OpenInNew, PinDropOutlined } from '@mui/icons-material';
import { GenericSubmodelElementComponent } from '../GenericSubmodelElementComponent';
import { EntityDetailsDialog } from './EntityDetailsDialog';
import { RelationShipDetailsDialog } from './RelationShipDetailsDialog';
import { ExternalRedirectDialog } from './ExternalRedirectDialog';
import { ExpandableTreeitem } from 'app/[locale]/viewer/_components/submodel-elements/generic-elements/entity-components/TreeItem';
import { useTranslations, useLocale } from 'next-intl';
import { searchInAllDiscoveries } from 'lib/services/discovery-service/discoveryActions';
import { TreeItemCheckbox, TreeItemGroupTransition, TreeItemIconContainer } from '@mui/x-tree-view/TreeItem';
import { TreeItemIcon } from '@mui/x-tree-view/TreeItemIcon';
import { TreeItemProvider } from '@mui/x-tree-view/TreeItemProvider';
import { CustomTreeItemContent } from '../../../submodel/bill-of-applications/visualization-components/ApplicationTreeItem';
import { useTreeItem, UseTreeItemParameters } from '@mui/x-tree-view/useTreeItem';

type AssetLinkType = 'loading' | 'internal' | 'external' | 'hidden';

const URL_REGEX = /^https?:\/\/.+/i;

interface EntityTreeItemProps
    extends Omit<UseTreeItemParameters, 'rootRef'>, Omit<React.HTMLAttributes<HTMLLIElement>, 'onFocus'> {
    applicationUrl?: string;
    data?: SubmodelElementChoice;
    bulkCount?: string;
}

const CustomContent = React.forwardRef(function CustomContent(
    props: EntityTreeItemProps,
    ref: React.Ref<HTMLLIElement>,
) {
    const t = useTranslations('pages.aasViewer.submodels');
    const locale = useLocale();
    const { id, label, itemId, children, data, disabled, bulkCount, ...other } = props;
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
    const [externalRedirectOpen, setExternalRedirectOpen] = React.useState(false);
    const [assetLinkType, setAssetLinkType] = React.useState<AssetLinkType>('loading');

    React.useEffect(() => {
        if (!assetId) {
            setAssetLinkType('hidden');
            return;
        }

        let cancelled = false;

        async function checkDiscovery() {
            const { isSuccess, result: discoverySearchResult } = await searchInAllDiscoveries(assetId!);
            if (cancelled) return;

            if (isSuccess && discoverySearchResult.length > 0) {
                setAssetLinkType('internal');
            } else if (URL_REGEX.test(assetId!)) {
                setAssetLinkType('external');
            } else {
                setAssetLinkType('hidden');
            }
        }

        checkDiscovery();
        return () => {
            cancelled = true;
        };
    }, [assetId]);

    const handleInternalNavigate = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        event.stopPropagation();
        if (!assetId) return;
        const prefix = locale ? `/${locale}` : '';
        const assetPath = `${prefix}/asset?assetId=${encodeURIComponent(assetId)}`;
        window.open(assetPath, '_blank', 'noopener,noreferrer');
    };

    const handleExternalClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        event.stopPropagation();
        setExternalRedirectOpen(true);
    };

    const handleExternalConfirm = () => {
        if (!assetId) return;
        window.open(assetId, '_blank', 'noopener,noreferrer');
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
                        <ExpandableTreeitem
                            dataIcon={dataIcon}
                            itemId={itemId}
                            label={label}
                            bulkCount={bulkCount}
                            {...other}
                        />
                        <Box sx={{ ml: 'auto', pl: 1, display: 'flex' }}>
                            {assetId && !showDataDirectly && (
                                <>
                                    <IconButton sx={{ mr: 1 }} onClick={handleDetailsClick}>
                                        <InfoOutlined data-testid="entity-info-icon" sx={{ color: 'text.secondary' }} />
                                    </IconButton>
                                    {assetLinkType === 'loading' && (
                                        <Button
                                            endIcon={<ArrowForward />}
                                            size="small"
                                            onClick={handleInternalNavigate}
                                            data-testid="view-asset-button"
                                            loading
                                        >
                                            {t('actions.view')}
                                        </Button>
                                    )}
                                    {assetLinkType === 'internal' && (
                                        <Button
                                            endIcon={<ArrowForward />}
                                            size="small"
                                            onClick={handleInternalNavigate}
                                            data-testid="view-asset-button"
                                        >
                                            {t('actions.view')}
                                        </Button>
                                    )}
                                    {assetLinkType === 'external' && (
                                        <Button
                                            endIcon={<OpenInNew />}
                                            size="small"
                                            onClick={handleExternalClick}
                                            data-testid="view-asset-button"
                                        >
                                            {t('actions.open')}
                                        </Button>
                                    )}
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
                    bulkCount={bulkCount}
                />
            )}
            {isRelationShip && (
                <RelationShipDetailsDialog
                    open={detailsModalOpen}
                    handleClose={handleDetailsModalClose}
                    relationship={props.data as RelationshipElement}
                />
            )}
            {assetId && assetLinkType === 'external' && (
                <ExternalRedirectDialog
                    open={externalRedirectOpen}
                    handleClose={() => setExternalRedirectOpen(false)}
                    url={assetId}
                    onConfirm={handleExternalConfirm}
                />
            )}
        </TreeItemProvider>
    );
});

export const EntityTreeItem = (props: EntityTreeItemProps) => {
    return <CustomContent {...props} />;
};
