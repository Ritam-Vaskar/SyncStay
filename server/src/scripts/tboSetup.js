#!/usr/bin/env node

/**
 * TBO Integration Setup Script
 * 
 * This script automates the complete TBO hotel integration process:
 * 1. Removes old seeded hotels
 * 2. Syncs 60 TBO hotels from 5 Indian cities
 * 3. Generates embeddings for AI recommendations
 * 
 * Usage:
 *   npm run tbo:setup
 *   OR
 *   node src/scripts/tboSetup.js
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scriptsDir = __dirname;

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runScript(scriptPath, scriptName) {
  return new Promise((resolve, reject) => {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`🚀 Running: ${scriptName}`, 'bright');
    log('='.repeat(60), 'cyan');

    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`\n✅ ${scriptName} completed successfully!`, 'green');
        resolve();
      } else {
        log(`\n❌ ${scriptName} failed with code ${code}`, 'red');
        reject(new Error(`${scriptName} failed`));
      }
    });

    child.on('error', (error) => {
      log(`\n❌ Error running ${scriptName}: ${error.message}`, 'red');
      reject(error);
    });
  });
}

async function main() {
  log('\n' + '='.repeat(60), 'blue');
  log('  TBO HOTEL INTEGRATION SETUP', 'bright');
  log('='.repeat(60), 'blue');
  log('This will:', 'yellow');
  log('  1. Remove old seeded hotels', 'yellow');
  log('  2. Sync 60 TBO hotels (5 cities × 12 hotels)', 'yellow');
  log('  3. Generate AI embeddings for recommendations\n', 'yellow');

  const scripts = [
    {
      path: path.join(scriptsDir, 'removeSeededHotels.js'),
      name: 'Remove Seeded Hotels',
    },
    {
      path: path.join(scriptsDir, 'syncTBOHotels.js'),
      name: 'Sync TBO Hotels',
    },
    {
      path: path.join(scriptsDir, 'generateEmbeddings.js'),
      name: 'Generate Embeddings',
    },
  ];

  try {
    for (const script of scripts) {
      await runScript(script.path, script.name);
    }

    log('\n' + '='.repeat(60), 'green');
    log('  🎉 TBO INTEGRATION COMPLETE!', 'bright');
    log('='.repeat(60), 'green');
    log('\n✅ All TBO hotels are now synced and ready for use!', 'green');
    log('✅ AI recommendations are enabled with vector embeddings', 'green');
    log('\n📝 Next steps:', 'cyan');
    log('  1. Start your server: npm run dev', 'cyan');
    log('  2. Create an event as a planner', 'cyan');
    log('  3. View AI hotel recommendations in the microsite\n', 'cyan');

    process.exit(0);
  } catch (error) {
    log('\n' + '='.repeat(60), 'red');
    log('  ❌ SETUP FAILED', 'bright');
    log('='.repeat(60), 'red');
    log(`\nError: ${error.message}`, 'red');
    log('\n💡 Troubleshooting:', 'yellow');
    log('  • Ensure MongoDB is running (docker-compose up -d mongo)', 'yellow');
    log('  • Check your .env file has TBO credentials', 'yellow');
    log('  • Verify network connectivity to TBO API\n', 'yellow');

    process.exit(1);
  }
}

main();
