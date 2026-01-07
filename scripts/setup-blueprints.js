#!/usr/bin/env node

/**
 * Script to create blueprints from template files and update environment variables
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES = [
    {
        filePath: path.join(__dirname, '../templates/nameplate-vec-template.json'),
        envVarName: 'FILE_UPLOAD_BLUEPRINTS_VEC',
    },
    {
        filePath: path.join(__dirname, '../templates/nameplate-kbl-template.json'),
        envVarName: 'FILE_UPLOAD_BLUEPRINTS_KBL',
    },
];

const ENV_FILE_PATH = path.join(__dirname, '../.env.development.local');

/**
 * Creates a blueprint by posting the template to the AAS Generator API
 */
async function createBlueprint(templateData, apiUrl, apiKey) {
    const response = await fetch(`${apiUrl}/api/v2/Blueprints`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey,
        },
        body: JSON.stringify(templateData),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create blueprint: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const blueprintId = await response.text();
    return blueprintId.replace(/^"|"$/g, ''); // Remove surrounding quotes if present
}

/**
 * Reads and parses environment variables from .env file
 */
function readEnvFile() {
    const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
    const envMap = new Map();

    envContent.split('\n').forEach((line) => {
        if (line.trim().startsWith('#') || !line.trim()) {
            return;
        }

        const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?(.+?)"?\s*$/);
        if (match) {
            const [, key, value] = match;
            envMap.set(key, value);
        }
    });

    return envMap;
}

/**
 * Updates the .env file with new blueprint IDs
 */
function updateEnvFile(updates) {
    let envContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8');

    Object.entries(updates).forEach(([key, value]) => {
        const regex = new RegExp(`^(${key}\\s*=\\s*)"?.*?"?\\s*$`, 'm');

        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `$1"${value}"`);
        } else {
            envContent += `\n${key}="${value}"\n`;
        }
    });

    fs.writeFileSync(ENV_FILE_PATH, envContent, 'utf-8');
}

/**
 * Main execution
 */
async function main() {
    console.log('🚀 Starting blueprint setup...\n');

    const envVars = readEnvFile();
    const apiUrl = envVars.get('MNESTIX_AAS_GENERATOR_API_URL') || 'http://localhost:5064';
    const apiKey = envVars.get('MNESTIX_BACKEND_API_KEY') || '';

    if (!apiKey) {
        console.warn('⚠️  Warning: MNESTIX_BACKEND_API_KEY not found in environment');
    }

    console.log(`📡 Using API URL: ${apiUrl}\n`);

    const updates = {};

    for (const template of TEMPLATES) {
        try {
            console.log(`📄 Processing ${path.basename(template.filePath)}...`);

            if (!fs.existsSync(template.filePath)) {
                console.error(`   ❌ File not found: ${template.filePath}`);
                continue;
            }

            const templateContent = fs.readFileSync(template.filePath, 'utf-8');
            const templateData = JSON.parse(templateContent);

            console.log(`   🔨 Creating blueprint...`);
            const blueprintId = await createBlueprint(templateData, apiUrl, apiKey);
            console.log(`   ✅ Blueprint created with ID: ${blueprintId}`);

            updates[template.envVarName] = `["${blueprintId}"]`;
        } catch (error) {
            console.error(`   ❌ Error processing ${template.filePath}:`, error.message);
            throw error;
        }
    }

    if (Object.keys(updates).length > 0) {
        console.log(`\n📝 Updating ${ENV_FILE_PATH}...`);
        updateEnvFile(updates);
        console.log('   ✅ Environment file updated successfully!');

        console.log('\n📋 Updated values:');
        Object.entries(updates).forEach(([key, value]) => {
            console.log(`   ${key}=${value}`);
        });
    }

    console.log('\n✨ Blueprint setup completed successfully!\n');
}

main().catch((error) => {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
});
