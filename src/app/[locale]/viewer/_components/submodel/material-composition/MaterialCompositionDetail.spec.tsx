import { expect } from '@jest/globals';
import { screen } from '@testing-library/react';
import { Submodel, SubmodelElementCollection } from 'lib/api/aas/models';
import { extractMaterialPieData, MaterialCompositionDetail } from './MaterialCompositionDetail';
import { CustomRender } from 'test-utils/CustomRender';

window.ResizeObserver =
    window.ResizeObserver ||
    jest.fn().mockImplementation(() => ({
        disconnect: jest.fn(),
        observe: jest.fn(),
        unobserve: jest.fn(),
    }));

jest.mock('recharts', () => {
    const OriginalRechartsModule = jest.requireActual('recharts');

    return {
        ...OriginalRechartsModule,
        ResponsiveContainer: ({ height, children }: never) => (
            <div className="recharts-responsive-container" style={{ width: 800, height: height || 300 }}>
                {children}
            </div>
        ),
    };
});

function buildMaterialCompositionSubmodel(withHazardousEntries: boolean): Submodel {
    return {
        id: 'material-composition-submodel',
        idShort: 'MaterialComposition',
        modelType: 'Submodel',
        semanticId: {
            keys: [{ type: 'GlobalReference', value: 'https://admin-shell.io/idta/MaterialComposition/1/0/Submodel' }],
            type: 'ExternalReference',
        },
        submodelElements: [
            {
                modelType: 'SubmodelElementCollection',
                idShort: 'ProductMaterials',
                value: [
                    {
                        modelType: 'SubmodelElementCollection',
                        idShort: 'Copper',
                        semanticId: {
                            keys: [
                                {
                                    type: 'GlobalReference',
                                    value: 'https://admin-shell.io/idta/MaterialComposition/ProductMaterial/1/0',
                                },
                            ],
                            type: 'ExternalReference',
                        },
                        value: [
                            {
                                modelType: 'Property',
                                idShort: 'ProductMaterialName',
                                valueType: 'xs:string',
                                value: 'Copper',
                            },
                            {
                                modelType: 'Property',
                                idShort: 'ProductMaterialMass',
                                valueType: 'xs:float',
                                value: '1.35',
                            },
                        ],
                    },
                    {
                        modelType: 'SubmodelElementCollection',
                        idShort: 'PVC',
                        semanticId: {
                            keys: [
                                {
                                    type: 'GlobalReference',
                                    value: 'https://admin-shell.io/idta/MaterialComposition/ProductMaterial/1/0',
                                },
                            ],
                            type: 'ExternalReference',
                        },
                        value: [
                            {
                                modelType: 'Property',
                                idShort: 'ProductMaterialName',
                                valueType: 'xs:string',
                                value: 'Polyvinyl Chloride (PVC)',
                            },
                            {
                                modelType: 'Property',
                                idShort: 'ProductMaterialMass',
                                valueType: 'xs:float',
                                value: '0.58',
                            },
                        ],
                    },
                    {
                        modelType: 'SubmodelElementCollection',
                        idShort: 'LithiumCobaltOxide',
                        semanticId: {
                            keys: [
                                {
                                    type: 'GlobalReference',
                                    value: 'https://admin-shell.io/idta/MaterialComposition/ProductMaterial/1/0',
                                },
                            ],
                            type: 'ExternalReference',
                        },
                        value: [
                            {
                                modelType: 'Property',
                                idShort: 'ProductMaterialName',
                                valueType: 'xs:string',
                                value: 'Lithium Cobalt Oxide',
                            },
                            {
                                modelType: 'Property',
                                idShort: 'ProductMaterialMass',
                                valueType: 'xs:float',
                                value: '0.42',
                            },
                        ],
                    },
                ],
            },
            {
                modelType: 'SubmodelElementCollection',
                idShort: 'HazardousSubstances',
                value: withHazardousEntries
                    ? [{ modelType: 'Property', idShort: 'SubstanceName', valueType: 'xs:string', value: 'Lead' }]
                    : [],
            },
        ],
    } as unknown as Submodel;
}

describe('MaterialCompositionDetail', () => {
    it('extracts chart data from product materials mass values', () => {
        const submodel = buildMaterialCompositionSubmodel(false);
        const productMaterialsCollection = submodel.submodelElements?.[0];

        const chartData = extractMaterialPieData(productMaterialsCollection as SubmodelElementCollection);

        expect(chartData).toHaveLength(3);
        expect(chartData.map((entry) => entry.name)).toEqual([
            'Copper',
            'Polyvinyl Chloride (PVC)',
            'Lithium Cobalt Oxide',
        ]);
    });

    it('renders pie chart slices and empty hazardous hint', () => {
        CustomRender(<MaterialCompositionDetail submodel={buildMaterialCompositionSubmodel(false)} />);

        expect(screen.getByTestId('material-composition-visualization')).toBeInTheDocument();
        expect(screen.getByTestId('material-composition-pie-chart')).toBeInTheDocument();
        expect(screen.getByTestId('submodel-dropdown-button')).toBeInTheDocument();
        expect(screen.getByTestId('material-composition-hazardous-empty-hint')).toBeInTheDocument();
    });

    it('renders hazardous substances via generic components when list has entries', () => {
        CustomRender(<MaterialCompositionDetail submodel={buildMaterialCompositionSubmodel(true)} />);

        expect(screen.queryByTestId('material-composition-hazardous-empty-hint')).not.toBeInTheDocument();
        expect(screen.getAllByTestId('submodel-dropdown-button')).toHaveLength(2);
    });
});
