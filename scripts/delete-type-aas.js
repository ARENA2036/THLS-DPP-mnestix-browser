#!/usr/bin/env node

/**
 * Script to delete type AAS (Asset Administration Shells) from the Type Repository
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
 * Encodes a string to base64
 */
function toBase64(str) {
    return Buffer.from(str).toString('base64');
}

/**
 * Deletes an AAS from the Type Repository
 */
async function deleteAAS(aasId, typeProxyUrl, apiKey) {
    const encodedId = toBase64(aasId);

    const headers = {};
    if (apiKey) {
        headers['X-API-KEY'] = apiKey;
    }

    const response = await fetch(`${typeProxyUrl}/shells/${encodedId}`, {
        method: 'DELETE',
        headers,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete AAS: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return aasId;
}

/**
 * Main execution
 */
async function main() {
    console.log('🗑️  Starting Type AAS deletion...\n');

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

    const deletedIds = [];
    const failedFiles = [];

    for (const file of files) {
        try {
            const filePath = path.join(TYPE_AAS_DIR, file);
            console.log(`📄 Processing ${file}...`);

            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const fileData = JSON.parse(fileContent);

            // Extract AAS ID from the JSON
            const aasId = fileData.assetAdministrationShells?.[0]?.id;
            if (!aasId) {
                throw new Error(`No AAS ID found in ${file}`);
            }

            const deletedId = await deleteAAS(aasId, typeProxyUrl, apiKey);
            console.log(`   ✅ Deleted with ID: ${deletedId}`);
            deletedIds.push(deletedId);
        } catch (error) {
            console.error(`   ❌ Error processing ${file}:`, error.message);
            failedFiles.push({ file, error: error.message });
        }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successful: ${deletedIds.length}`);
    console.log(`   ❌ Failed: ${failedFiles.length}`);

    if (deletedIds.length > 0) {
        console.log('\n📋 Deleted AAS IDs:');
        deletedIds.forEach((id) => {
            console.log(`   ${id}`);
        });
    }

    if (failedFiles.length > 0) {
        console.log('\n❌ Failed Files:');
        failedFiles.forEach(({ file, error }) => {
            console.log(`   - ${file}`);
            console.log(`     ${error}`);
        });
        console.log('\n⚠️  Type AAS deletion completed with errors!\n');
        process.exit(1);
    }

    console.log('\n✨ Type AAS deletion completed successfully!\n');
}

main().catch((error) => {
    console.error('\n❌ Deletion failed:', error.message);
    process.exit(1);
});
