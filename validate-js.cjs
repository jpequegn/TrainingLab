#!/usr/bin/env node

/**
 * Simple JavaScript syntax validator
 */

const fs = require('fs');

function validateJavaScript(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Basic syntax check by attempting to parse
        // Remove export/import statements for basic validation
        const testContent = content
            .replace(/export\s+/g, '')
            .replace(/import\s+.*?from\s+['"][^'"]+['"];?/g, '')
            .replace(/import\s+['"][^'"]+['"];?/g, '');
        
        // Try to evaluate in a sandbox (basic check)
        // eslint-disable-next-line no-new-func
        new Function(testContent);
        
        console.log(`✅ ${filePath}: Syntax OK`);
        return true;
    } catch (error) {
        console.error(`❌ ${filePath}: Syntax Error`);
        console.error(`   ${error.message}`);
        
        // Try to identify the line number
        const lines = fs.readFileSync(filePath, 'utf8').split('\n');
        if (error.lineNumber) {
            const lineNum = error.lineNumber;
            console.error(`   Line ${lineNum}: ${lines[lineNum - 1]}`);
        }
        
        return false;
    }
}

// Validate the modern UI script
const files = [
    'modern-ui-upgrade.js',
    'debug-modern-ui.js'
];

console.log('🔍 Validating JavaScript files...\n');

let allValid = true;
files.forEach(file => {
    if (fs.existsSync(file)) {
        const isValid = validateJavaScript(file);
        allValid = allValid && isValid;
    } else {
        console.error(`❌ ${file}: File not found`);
        allValid = false;
    }
});

console.log(`\n${allValid ? '✅ All files valid' : '❌ Some files have errors'}`);
process.exit(allValid ? 0 : 1);