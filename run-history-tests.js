#!/usr/bin/env node

/**
 * Quick Test Runner for TrainingLab HistoryPage
 *
 * This script runs the E2E tests specifically for the HistoryPage implementation
 * and provides a quick verification that all components are working correctly.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 TrainingLab HistoryPage Test Runner');
console.log('=====================================\n');

// Check if Playwright is installed
try {
  require('@playwright/test');
  console.log('✅ Playwright is available');
} catch (error) {
  console.log('❌ Playwright not found. Installing...');
  console.log('Run: npm install @playwright/test');
  process.exit(1);
}

// Check if test file exists
const testFile = path.join(__dirname, 'tests', 'e2e', 'history-page.spec.js');
if (!fs.existsSync(testFile)) {
  console.log('❌ Test file not found:', testFile);
  process.exit(1);
}
console.log('✅ Test file found');

// Run the tests
console.log('\n🚀 Starting HistoryPage E2E Tests...\n');

const testProcess = spawn(
  'npx',
  ['playwright', 'test', testFile, '--reporter=list'],
  {
    stdio: 'inherit',
    shell: true,
  }
);

testProcess.on('close', code => {
  console.log('\n📊 Test Execution Summary:');
  console.log('===========================');

  if (code === 0) {
    console.log('✅ All tests passed successfully!');
    console.log('\n🎉 HistoryPage implementation is working correctly');
    console.log('\n📝 Key Features Verified:');
    console.log('   • Page navigation and loading');
    console.log('   • View toggle (Timeline/Calendar/Stats)');
    console.log('   • ActivityCalendar with TSS indicators');
    console.log('   • PerformanceTrends with charts');
    console.log('   • Modal functionality');
    console.log('   • Filter operations');
    console.log('   • Error handling');
    console.log('   • Mobile responsiveness');
  } else {
    console.log('⚠️  Some tests failed or had issues');
    console.log('   Check the output above for details');
    console.log('\n🔧 Possible Issues:');
    console.log('   • Server not running on port 3000');
    console.log('   • Chart.js not loading properly');
    console.log('   • Component state issues');
    console.log('   • Mock data generation problems');
  }

  console.log('\n📖 For detailed test documentation, see test-results.md');
  process.exit(code);
});

testProcess.on('error', error => {
  console.error('❌ Error running tests:', error.message);
  process.exit(1);
});
