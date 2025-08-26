#!/usr/bin/env node

/**
 * Authentication Integration Test Runner
 * 
 * This script helps run authentication integration tests with proper environment setup
 * Usage: node scripts/test-auth.js [options]
 * 
 * Options:
 *   --env=local|staging|production  Select environment (default: local)
 *   --verbose                       Show detailed output
 *   --coverage                      Generate coverage report
 *   --watch                         Run in watch mode
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  env: 'local',
  verbose: false,
  coverage: false,
  watch: false,
};

args.forEach(arg => {
  if (arg.startsWith('--env=')) {
    options.env = arg.split('=')[1];
  } else if (arg === '--verbose') {
    options.verbose = true;
  } else if (arg === '--coverage') {
    options.coverage = true;
  } else if (arg === '--watch') {
    options.watch = true;
  }
});

// Load environment variables based on selected environment
function loadEnvironment(env) {
  const envFiles = {
    local: '.env.test.local',
    staging: '.env.staging',
    production: '.env.production',
  };

  const envFile = envFiles[env] || envFiles.local;
  const envPath = path.join(process.cwd(), envFile);

  if (fs.existsSync(envPath)) {
    console.log(`📁 Loading environment from ${envFile}`);
    require('dotenv').config({ path: envPath });
  } else {
    console.log(`⚠️  No ${envFile} found, using current environment`);
  }

  // Validate required environment variables
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.log('\n💡 Tip: Create a .env.test.local file with your test Supabase credentials');
    console.log('   Or set them in your environment before running this script');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded successfully');
}

// Build Jest command
function buildJestCommand() {
  const jestArgs = ['test', 'tests/integration/'];
  
  if (options.coverage) {
    jestArgs.push('--coverage');
  }
  
  if (options.watch) {
    jestArgs.push('--watch');
  }
  
  if (options.verbose) {
    jestArgs.push('--verbose');
  } else {
    jestArgs.push('--silent');
  }
  
  // Add CI flag if not in watch mode
  if (!options.watch) {
    jestArgs.push('--ci');
  }

  return jestArgs;
}

// Run tests
function runTests() {
  console.log(`\n🧪 Running authentication integration tests (${options.env} environment)\n`);

  const jestArgs = buildJestCommand();
  
  const testProcess = spawn('npm', jestArgs, {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      FORCE_COLOR: '1',
    },
  });

  testProcess.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ All authentication tests passed!');
      
      if (options.coverage) {
        console.log('📊 Coverage report generated at coverage/lcov-report/index.html');
      }
    } else {
      console.log(`\n❌ Tests failed with exit code ${code}`);
    }
    
    process.exit(code);
  });

  testProcess.on('error', (err) => {
    console.error('Failed to start test process:', err);
    process.exit(1);
  });
}

// Main execution
console.log('🔐 Authentication Integration Test Runner');
console.log('=========================================');

loadEnvironment(options.env);
runTests();