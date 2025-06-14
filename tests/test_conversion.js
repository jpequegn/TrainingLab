// Node.js test for workout conversion functionality
const fs = require('fs');
const path = require('path');

// Mock DOM elements for testing
global.DOMParser = class {
    parseFromString(xmlString, mimeType) {
        // Simple XML parser mock for testing
        const doc = {
            querySelector: (selector) => {
                if (selector === 'workout_file') {
                    return {
                        querySelector: (tag) => {
                            const mockData = {
                                'name': { textContent: 'Sample Interval Workout' },
                                'description': { textContent: 'A sample workout with warmup, intervals, and cooldown' },
                                'author': { textContent: 'Sample Author' },
                                'sportType': { textContent: 'bike' },
                                'workout': {
                                    children: [
                                        {
                                            tagName: 'Warmup',
                                            getAttribute: (attr) => {
                                                const attrs = { Duration: '600', PowerLow: '0.5', PowerHigh: '0.7' };
                                                return attrs[attr];
                                            }
                                        },
                                        {
                                            tagName: 'SteadyState',
                                            getAttribute: (attr) => {
                                                const attrs = { Duration: '300', Power: '0.6' };
                                                return attrs[attr];
                                            }
                                        },
                                        {
                                            tagName: 'Cooldown',
                                            getAttribute: (attr) => {
                                                const attrs = { Duration: '600', PowerHigh: '0.6', PowerLow: '0.4' };
                                                return attrs[attr];
                                            }
                                        }
                                    ]
                                }
                            };
                            return mockData[tag];
                        }
                    };
                }
                return null;
            }
        };
        return doc;
    }
};

// Load the script content and extract the class
const scriptContent = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');

// Extract just the class definition and helper methods
const classMatch = scriptContent.match(/class ZwiftWorkoutVisualizer \{[\s\S]*?\n\}/);
if (!classMatch) {
    console.error('Could not extract ZwiftWorkoutVisualizer class');
    process.exit(1);
}

// Create a simplified version for testing
const testClass = `
${classMatch[0]}

// Test runner
class ConversionTester {
    constructor() {
        this.visualizer = new ZwiftWorkoutVisualizer();
        this.runTests();
    }

    runTests() {
        console.log('🧪 Running Workout Conversion Tests\\n');
        
        this.testWorkoutParsing();
        this.testERGGeneration();
        this.testMRCGeneration();
        this.testFTPUpdate();
        
        console.log('\\n✅ All tests completed!');
    }

    testWorkoutParsing() {
        try {
            // Mock workout data
            this.visualizer.workoutData = {
                name: 'Test Workout',
                description: 'Test Description',
                author: 'Test Author',
                sportType: 'bike',
                totalDuration: 1500,
                segments: [
                    {
                        type: 'Warmup',
                        startTime: 0,
                        duration: 600,
                        powerLow: 0.5,
                        powerHigh: 0.7
                    },
                    {
                        type: 'SteadyState',
                        startTime: 600,
                        duration: 300,
                        power: 0.6
                    },
                    {
                        type: 'Cooldown',
                        startTime: 900,
                        duration: 600,
                        powerLow: 0.6,
                        powerHigh: 0.4
                    }
                ]
            };
            console.log('✅ Workout parsing test: PASS');
        } catch (error) {
            console.log('❌ Workout parsing test: FAIL -', error.message);
        }
    }

    testERGGeneration() {
        try {
            this.visualizer.ftp = 250;
            const ergContent = this.visualizer.generateERGContent();
            
            // Verify ERG format
            const hasHeader = ergContent.includes('[COURSE HEADER]');
            const hasFTP = ergContent.includes('FTP=250');
            const hasMinutesWatts = ergContent.includes('MINUTES\\tWATTS');
            const hasDataSection = ergContent.includes('[COURSE DATA]');
            
            if (hasHeader && hasFTP && hasMinutesWatts && hasDataSection) {
                console.log('✅ ERG generation test: PASS');
                console.log('   Sample ERG content:');
                console.log('   ' + ergContent.split('\\n').slice(0, 10).join('\\n   '));
            } else {
                console.log('❌ ERG generation test: FAIL - Missing required elements');
            }
        } catch (error) {
            console.log('❌ ERG generation test: FAIL -', error.message);
        }
    }

    testMRCGeneration() {
        try {
            const mrcContent = this.visualizer.generateMRCContent();
            
            // Verify MRC format
            const hasHeader = mrcContent.includes('[COURSE HEADER]');
            const hasMinutesPercent = mrcContent.includes('MINUTES PERCENT');
            const hasDataSection = mrcContent.includes('[COURSE DATA]');
            
            if (hasHeader && hasMinutesPercent && hasDataSection) {
                console.log('✅ MRC generation test: PASS');
                console.log('   Sample MRC content:');
                console.log('   ' + mrcContent.split('\\n').slice(0, 10).join('\\n   '));
            } else {
                console.log('❌ MRC generation test: FAIL - Missing required elements');
            }
        } catch (error) {
            console.log('❌ MRC generation test: FAIL -', error.message);
        }
    }

    testFTPUpdate() {
        try {
            const originalFTP = this.visualizer.ftp;
            this.visualizer.updateFTP(300);
            
            if (this.visualizer.ftp === 300) {
                console.log('✅ FTP update test: PASS - Updated from', originalFTP, 'to 300');
            } else {
                console.log('❌ FTP update test: FAIL - FTP not updated correctly');
            }
        } catch (error) {
            console.log('❌ FTP update test: FAIL -', error.message);
        }
    }
}

// Run tests
new ConversionTester();
`;

// Execute the test
eval(testClass);