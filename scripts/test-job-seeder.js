#!/usr/bin/env node
/**
 * Test version of job seeder with smaller batch sizes for validation
 */

const JobSeeder = require('./job-seeder');

class TestJobSeeder extends JobSeeder {
  constructor() {
    super({ 
      dryRun: true, 
      limit: 10  // Small test batch
    });
  }
}

// Run test
async function testSeeder() {
  console.log('🧪 Testing ContractsOnly Job Seeder (Small Batch)');
  console.log('This will test the complete pipeline with 10 jobs\n');
  
  const testSeeder = new TestJobSeeder();
  await testSeeder.run();
}

testSeeder().catch(console.error);