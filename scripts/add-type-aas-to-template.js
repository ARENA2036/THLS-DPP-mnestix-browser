#!/usr/bin/env node

/**
 * Script to add type-aas references to the hierarchical-structures-template.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TYPE_AAS_DIR = path.join(__dirname, '../type-aas');
const TEMPLATE_PATH = path.join(__dirname, '../templates/hierarchical-structures-template.json');

/**
 * Creates an Entity element for a type-aas
 */
function createEntity(idShort, globalAssetId) {
    return {
        idShort,
        entityType: 'SelfManagedEntity',
        globalAssetId,
        modelType: 'Entity',
    };
}

/**
 * Creates a HasPart relationship between CableSet and the entity
 */
function createHasPartRelationship(entityIdShort) {
    return {
        idShort: 'HasPart',
        semanticId: {
            type: 'ExternalReference',
            keys: [
                {
                    type: 'GlobalReference',
                    value: 'https://admin-shell.io/idta/HierarchicalStructures/HasPart/1/0',
                },
            ],
        },
        first: {
            type: 'ModelReference',
            keys: [
                {
                    type: 'Submodel',
                    value: 'https://example.com/sm/cable_set_bom',
                },
                {
                    type: 'Entity',
                    value: 'CableSet',
                },
            ],
        },
        second: {
            type: 'ModelReference',
            keys: [
                {
                    type: 'Submodel',
                    value: 'https://example.com/sm/cable_set_bom',
                },
                {
                    type: 'Entity',
                    value: 'CableSet',
                },
                {
                    type: 'Entity',
                    value: entityIdShort,
                },
            ],
        },
        modelType: 'RelationshipElement',
    };
}

/**
 * Main execution
 */
async function main() {
    console.log('🚀 Starting to add type-aas to hierarchical structures template...\n');

    if (!fs.existsSync(TYPE_AAS_DIR)) {
        throw new Error(`Type AAS directory not found: ${TYPE_AAS_DIR}`);
    }

    const files = fs.readdirSync(TYPE_AAS_DIR).filter((file) => file.endsWith('.json'));

    if (files.length === 0) {
        console.warn('⚠️  No JSON files found in type-aas directory');
        return;
    }

    // Read template
    console.log(`📖 Reading template: ${path.basename(TEMPLATE_PATH)}...`);
    const templateContent = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    const template = JSON.parse(templateContent);

    // Extract AAS data from each type-aas file
    const aasEntries = [];
    for (const file of files) {
        try {
            const filePath = path.join(TYPE_AAS_DIR, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const fileData = JSON.parse(fileContent);

            const aasId = fileData.assetAdministrationShells?.[0]?.id;
            const globalAssetId = fileData.assetAdministrationShells?.[0]?.assetInformation?.globalAssetId;
            const idShort = file.replace('.json', '');

            if (!aasId || !globalAssetId) {
                console.warn(`⚠️  Skipping ${file}: Missing aasId or globalAssetId`);
                continue;
            }

            aasEntries.push({ idShort, aasId, globalAssetId, file });
            console.log(`   ✅ Extracted: ${idShort}`);
        } catch (error) {
            console.error(`   ❌ Error processing ${file}:`, error.message);
        }
    }

    if (aasEntries.length === 0) {
        console.warn('⚠️  No valid AAS entries found');
        return;
    }

    // Find CableSet entity in the template
    const cableSetIndex = template.submodelElements.findIndex((el) => el.idShort === 'CableSet');

    if (cableSetIndex === -1) {
        throw new Error('CableSet entity not found in template');
    }

    const cableSet = template.submodelElements[cableSetIndex];

    // Add new entities and relationships
    console.log(`\n📝 Adding ${aasEntries.length} type-aas references to CableSet...`);
    for (const entry of aasEntries) {
        // Add entity
        const entity = createEntity(entry.idShort, entry.globalAssetId);
        cableSet.statements.push(entity);

        // Add HasPart relationship
        const relationship = createHasPartRelationship(entry.idShort);
        cableSet.statements.push(relationship);

        console.log(`   ✅ Added: ${entry.idShort}`);
    }

    // Write updated template
    console.log(`\n💾 Writing updated template...`);
    fs.writeFileSync(TEMPLATE_PATH, JSON.stringify(template, null, '\t'), 'utf-8');
    console.log('   ✅ Template updated successfully!');

    console.log(`\n📋 Added type-aas references:`);
    aasEntries.forEach((entry) => {
        console.log(`   - ${entry.idShort}`);
    });

    console.log('\n✨ Type-aas additions completed successfully!\n');
}

main().catch((error) => {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
});
