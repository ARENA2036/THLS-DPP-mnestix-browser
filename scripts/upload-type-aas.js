#!/usr/bin/env node

/**
 * Script to upload type AAS (Asset Administration Shells) to the Type Repository
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TYPE_AAS_DIR = path.join(__dirname, '../type-aas');
const ENV_FILE_PATH = path.join(__dirname, '../.env.development.local');

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
 * Uploads an AAS to the Type Repository
 */
async function uploadAAS(filePath, typeProxyUrl, apiKey) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const fileData = JSON.parse(fileContent);

    // Extract AAS ID from the JSON
    const aasId = fileData.assetAdministrationShells?.[0]?.id;
    if (!aasId) {
        throw new Error(`No AAS ID found in ${path.basename(filePath)}`);
    }

    const formData = new FormData();
    formData.append('file', new Blob([fileContent], { type: 'application/json' }), path.basename(filePath));

    const headers = {};
    if (apiKey) {
        headers['X-API-KEY'] = apiKey;
    }

    const response = await fetch(`${typeProxyUrl}/upload`, {
        method: 'POST',
        headers,
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload AAS: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return aasId;
}

/**
 * Main execution
 */
async function main() {
    console.log('🚀 Starting Type AAS upload...\n');

    const envVars = readEnvFile();
    const typeProxyUrl = envVars.get('TYPE_AAS_GENERATION_SCRIPT_REPO_URL');
    const apiKey = envVars.get('MNESTIX_BACKEND_API_KEY') || '';

    if (!typeProxyUrl) {
        throw new Error('TYPE_AAS_GENERATION_SCRIPT_REPO_URL not found in environment');
    }

    if (!apiKey) {
        console.warn('⚠️  Warning: MNESTIX_BACKEND_API_KEY not found in environment');
    }

    console.log(`📡 Using Type Proxy URL: ${typeProxyUrl}\n`);

    if (!fs.existsSync(TYPE_AAS_DIR)) {
        throw new Error(`Type AAS directory not found: ${TYPE_AAS_DIR}`);
    }

    const files = fs.readdirSync(TYPE_AAS_DIR).filter((file) => file.endsWith('.json'));

    if (files.length === 0) {
        console.warn('⚠️  No JSON files found in type-aas directory');
        return;
    }

    const uploadedIds = [];
    const failedFiles = [];

    for (const file of files) {
        try {
            const filePath = path.join(TYPE_AAS_DIR, file);
            console.log(`📄 Processing ${file}...`);

            const aasId = await uploadAAS(filePath, typeProxyUrl, apiKey);
            console.log(`   ✅ Uploaded with ID: ${aasId}`);
            uploadedIds.push(aasId);
        } catch (error) {
            console.error(`   ❌ Error processing ${file}:`, error.message);
            failedFiles.push({ file, error: error.message });
        }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successful: ${uploadedIds.length}`);
    console.log(`   ❌ Failed: ${failedFiles.length}`);

    if (uploadedIds.length > 0) {
        console.log('\n📋 Uploaded AAS IDs:');
        uploadedIds.forEach((id) => {
            console.log(`   ${id}`);
        });
    }

    if (failedFiles.length > 0) {
        console.log('\n❌ Failed Files:');
        failedFiles.forEach(({ file, error }) => {
            console.log(`   - ${file}`);
            console.log(`     ${error}`);
        });
        console.log('\n⚠️  Type AAS upload completed with errors!\n');
        process.exit(1);
    }

    console.log('\n✨ Type AAS upload completed successfully!\n');
}

main().catch((error) => {
    console.error('\n❌ Upload failed:', error.message);
    process.exit(1);
});
