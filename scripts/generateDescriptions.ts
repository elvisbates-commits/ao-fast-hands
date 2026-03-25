import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generates src/data/commandDescriptions.ts from data/commandDescriptions.json
 * This script should be run during build or manually when descriptions are updated
 */
function generateDescriptions() {
  const jsonPath = join(__dirname, '../data/commandDescriptions.json');
  const outputPath = join(__dirname, '../src/data/commandDescriptions.ts');

  try {
    const jsonContent = readFileSync(jsonPath, 'utf-8');
    const descriptions = JSON.parse(jsonContent);

    // Generate TypeScript file
    const tsContent = `/**
 * Generated file - DO NOT EDIT DIRECTLY
 * This file is auto-generated from data/commandDescriptions.json
 * To update descriptions, edit the JSON file and run: npm run generate:descriptions
 */

import type { CommandDescription } from '../types/commandDescriptions';

export const commandDescriptions: Record<string, CommandDescription> = ${JSON.stringify(descriptions, null, 2)} as Record<string, CommandDescription>;
`;

    writeFileSync(outputPath, tsContent, 'utf-8');
    console.log(`✓ Generated ${outputPath}`);
    console.log(`  Total descriptions: ${Object.keys(descriptions).length}`);
  } catch (error) {
    console.error('Error generating descriptions:', error);
    process.exit(1);
  }
}

generateDescriptions();

