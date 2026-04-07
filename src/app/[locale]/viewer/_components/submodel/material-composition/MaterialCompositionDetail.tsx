import { Box, Typography } from '@mui/material';
import { DataRow } from 'components/basics/DataRow';
import { KeyTypes, Property, SubmodelElementChoice, SubmodelElementCollection } from 'lib/api/aas/models';
import { cutDecimalPlaces, stringToFloat } from 'lib/util/NumberUtil';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Legend, Pie, PieChart, PieSectorDataItem, ResponsiveContainer, Sector, Tooltip } from 'recharts';
import { SubmodelVisualizationProps } from '../SubmodelVisualizationProps';
import { GenericSubmodelElementComponent } from '../../submodel-elements/generic-elements/GenericSubmodelElementComponent';

type MaterialPieData = {
    name: string;
    mass: number;
    fill?: string;
    opacity?: number;
};

const PRODUCT_MATERIALS_COLLECTION_ID_SHORT = 'ProductMaterials';
const PRODUCT_MATERIAL_SEMANTIC_ID = 'https://admin-shell.io/idta/MaterialComposition/ProductMaterial/1/0';
const PRODUCT_MATERIAL_NAME_ID_SHORT = 'ProductMaterialName';
const PRODUCT_MATERIAL_MASS_ID_SHORT = 'ProductMaterialMass';
const HAZARDOUS_SUBSTANCES_COLLECTION_ID_SHORT = 'HazardousSubstances';

function isSubmodelElementCollection(
    submodelElement: SubmodelElementChoice | undefined,
): submodelElement is SubmodelElementCollection {
    return submodelElement?.modelType === KeyTypes.SubmodelElementCollection;
}

function findCollectionByIdShort(
    submodelElements: SubmodelElementChoice[] | undefined,
    idShort: string,
): SubmodelElementCollection | undefined {
    return submodelElements?.find(
        (submodelElement) => isSubmodelElementCollection(submodelElement) && submodelElement.idShort === idShort,
    ) as SubmodelElementCollection | undefined;
}

function hasSemanticId(submodelElement: SubmodelElementChoice, semanticId: string): boolean {
    return submodelElement.semanticId?.keys?.some((key) => key.value === semanticId) ?? false;
}

function findPropertyValue(submodelElements: SubmodelElementChoice[] | undefined, idShort: string): string | undefined {
    const property = submodelElements?.find(
        (submodelElement) => submodelElement.modelType === KeyTypes.Property && submodelElement.idShort === idShort,
    ) as Property | undefined;

    return property?.value;
}

export function extractMaterialPieData(
    productMaterialsCollection: SubmodelElementCollection | undefined,
): MaterialPieData[] {
    if (!productMaterialsCollection?.value?.length) return [];

    const groupedMassByName = new Map<string, number>();

    productMaterialsCollection.value.forEach((submodelElement, index) => {
        if (!isSubmodelElementCollection(submodelElement)) return;
        if (!hasSemanticId(submodelElement, PRODUCT_MATERIAL_SEMANTIC_ID)) return;

        const materialName =
            findPropertyValue(submodelElement.value, PRODUCT_MATERIAL_NAME_ID_SHORT) || `Material ${index + 1}`;
        const mass = stringToFloat(findPropertyValue(submodelElement.value, PRODUCT_MATERIAL_MASS_ID_SHORT) || '', NaN);

        if (!Number.isFinite(mass) || mass <= 0) return;

        groupedMassByName.set(materialName, (groupedMassByName.get(materialName) || 0) + mass);
    });

    return Array.from(groupedMassByName.entries()).map(([name, mass]) => ({ name, mass }));
}

export function MaterialCompositionDetail({ submodel }: SubmodelVisualizationProps) {
    const t = useTranslations('components.materialComposition');

    const [activeSlice, setActiveSlice] = useState<number>(-1);

    const productMaterialsCollection = findCollectionByIdShort(
        submodel.submodelElements,
        PRODUCT_MATERIALS_COLLECTION_ID_SHORT,
    );
    const hazardousSubstancesCollection = findCollectionByIdShort(
        submodel.submodelElements,
        HAZARDOUS_SUBSTANCES_COLLECTION_ID_SHORT,
    );

    const chartData = useMemo(() => extractMaterialPieData(productMaterialsCollection), [productMaterialsCollection]);

    const isHazardousSubstancesEmpty = !hazardousSubstancesCollection?.value?.length;

    const colors = ['#cc3300', '#a50d00', '#1e73be', '#66aaff', '#4831b0'];

    const chartDataWithStyle = useMemo(
        () =>
            chartData.map((entry, index) => ({
                ...entry,
                fill: colors[index % colors.length],
                opacity: activeSlice === -1 || activeSlice === index ? 1 : 0.45,
            })),
        [chartData, colors, activeSlice],
    );

    const renderPieSliceShape = (props: PieSectorDataItem) => {
        return <Sector {...props} fill={props.payload?.fill || props.fill} opacity={props.payload?.opacity || 1} />;
    };

    return (
        <Box data-testid="material-composition-visualization">
            <DataRow title={t('materialsByMassTitle')} hasDivider={false}>
                {!chartData.length && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        data-testid="material-composition-empty-chart-hint"
                    >
                        {t('noProductMaterialMassData')}
                    </Typography>
                )}

                {!!chartData.length && (
                    <Box sx={{ width: '100%', height: 360 }} data-testid="material-composition-pie-chart">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={chartDataWithStyle}
                                    dataKey="mass"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={120}
                                    isAnimationActive={false}
                                    shape={renderPieSliceShape}
                                    onMouseEnter={(_, index) => setActiveSlice(index)}
                                    onMouseLeave={() => setActiveSlice(-1)}
                                />
                                <Legend />
                                <Tooltip
                                    formatter={(value: number | string) => `${cutDecimalPlaces(Number(value), 3)} kg`}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                )}
            </DataRow>

            {productMaterialsCollection && (
                <GenericSubmodelElementComponent
                    submodelElement={productMaterialsCollection}
                    submodelId={submodel.id}
                    hasDivider={true}
                />
            )}

            {hazardousSubstancesCollection ? (
                <>
                    <GenericSubmodelElementComponent
                        submodelElement={hazardousSubstancesCollection}
                        submodelId={submodel.id}
                        hasDivider={true}
                    />
                    {isHazardousSubstancesEmpty && (
                        <Typography
                            variant="body2"
                            sx={{ mt: 1 }}
                            data-testid="material-composition-hazardous-empty-hint"
                        >
                            {t('noHazardousSubstancesPresent')}
                        </Typography>
                    )}
                </>
            ) : (
                <DataRow title={t('hazardousSubstancesTitle')}>
                    <Typography variant="body2">{t('hazardousSubstancesUnavailable')}</Typography>
                </DataRow>
            )}
        </Box>
    );
}
