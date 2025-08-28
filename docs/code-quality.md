# 🔍 Code Quality & Technical Debt Management

This document outlines the code quality tools, metrics, and practices used in the WkoLibrary project.

## 📊 Quality Metrics & Tools

### 1. Complexity Analysis

**Tool**: Plato  
**Command**: `npm run quality:complexity`  
**Report Location**: `./reports/complexity/`

**Metrics Tracked**:

- **Cyclomatic Complexity**: Measures the number of linearly independent paths through code
- **Halstead Metrics**: Software complexity based on operators and operands
- **Maintainability Index**: Overall maintainability score (0-100, higher is better)
- **Lines of Code**: Physical and logical lines of code
- **Estimated Errors**: Predicted number of bugs based on complexity

**Thresholds**:

- Cyclomatic Complexity: ≤ 15 (warning), ≤ 10 (ideal)
- Maintainability Index: ≥ 70 (good), ≥ 85 (excellent)
- Function Length: ≤ 50 lines (warning), ≤ 30 lines (ideal)

### 2. Duplicate Code Detection

**Tool**: JSCPD (JavaScript Copy/Paste Detector)  
**Command**: `npm run quality:duplicates`  
**Report Location**: `./reports/jscpd/`

**Configuration**:

- Minimum duplicate block: 5 lines or 100 tokens
- Formats: JavaScript, TypeScript
- Excluded: tests, node_modules, generated files

**Thresholds**:

- Duplication Rate: ≤ 5% (good), ≤ 3% (excellent)
- Max duplicate blocks per file: ≤ 3

### 3. Dependency Analysis

**Tool**: Madge  
**Commands**:

- `npm run quality:dependencies` - Check for circular dependencies
- `npm run quality:dependencies:graph` - Generate dependency graph

**What it detects**:

- Circular dependencies (should be 0)
- Dependency depth and complexity
- Orphaned modules
- Module coupling

### 4. ESLint Quality Rules

**Enhanced rules for maintainability**:

- `complexity`: Max cyclomatic complexity of 15
- `max-depth`: Max nesting depth of 4
- `max-lines`: Max 300 lines per file
- `max-lines-per-function`: Max 50 lines per function
- `max-params`: Max 5 parameters per function
- `no-magic-numbers`: Warn on magic numbers (with exceptions)

## 🎯 Quality Standards

### Code Quality Targets

| Metric                | Good        | Excellent   | Notes              |
| --------------------- | ----------- | ----------- | ------------------ |
| Cyclomatic Complexity | ≤ 15        | ≤ 10        | Per function       |
| Maintainability Index | ≥ 70        | ≥ 85        | Per file           |
| Code Duplication      | ≤ 5%        | ≤ 3%        | Project-wide       |
| Test Coverage         | ≥ 80%       | ≥ 90%       | Lines covered      |
| Function Length       | ≤ 50 lines  | ≤ 30 lines  | Excluding comments |
| File Length           | ≤ 300 lines | ≤ 200 lines | Excluding comments |
| Circular Dependencies | 0           | 0           | Zero tolerance     |

### Technical Debt Classification

**Critical Debt** (Fix immediately):

- Circular dependencies
- Functions with complexity > 20
- Duplicate code blocks > 50 lines
- Files with maintainability index < 50

**High Priority Debt** (Fix within sprint):

- Functions with complexity 15-20
- Files with maintainability index 50-70
- Duplicate code blocks 20-50 lines
- Functions > 100 lines

**Medium Priority Debt** (Fix within 2 sprints):

- Functions with complexity 10-15
- Files with maintainability index 70-85
- Duplicate code blocks 10-20 lines
- Magic numbers without constants

**Low Priority Debt** (Fix when convenient):

- Minor style inconsistencies
- Non-critical warnings
- Optimization opportunities

## 🔧 Usage Guide

### Running Quality Analysis

```bash
# Run all quality checks
npm run quality:all

# Generate comprehensive report with visualizations
npm run quality:report

# Individual tools
npm run quality:complexity     # Complexity analysis
npm run quality:duplicates     # Duplicate code detection
npm run quality:dependencies   # Circular dependency check
```

### Interpreting Reports

#### Complexity Report

- Navigate to `reports/complexity/index.html`
- Focus on files with red/orange indicators
- Prioritize functions with high cyclomatic complexity
- Look for maintainability index trends

#### Duplicate Code Report

- Open `reports/jscpd/index.html`
- Review duplicate blocks by size and frequency
- Consider refactoring common patterns into utilities
- Check if duplicates are intentional (configs, tests)

#### Dependency Graph

- View `reports/dependencies.svg`
- Look for circular references (red arrows)
- Identify overly complex dependency chains
- Find opportunities for better module organization

### Fixing Common Issues

#### High Complexity Functions

```javascript
// Before: High complexity (nested conditions)
function processWorkout(workout) {
  if (workout) {
    if (workout.segments) {
      if (workout.segments.length > 0) {
        for (let segment of workout.segments) {
          if (segment.type === 'interval') {
            if (segment.power > 0.8) {
              // Complex logic here
            }
          }
        }
      }
    }
  }
}

// After: Reduced complexity (early returns, extraction)
function processWorkout(workout) {
  if (!workout?.segments?.length) return;

  const intervals = workout.segments.filter(isHighIntensityInterval);
  intervals.forEach(processHighIntensityInterval);
}

function isHighIntensityInterval(segment) {
  return segment.type === 'interval' && segment.power > 0.8;
}

function processHighIntensityInterval(segment) {
  // Complex logic extracted to separate function
}
```

#### Duplicate Code

```javascript
// Before: Duplicated validation logic
function validateWorkout(workout) {
  if (!workout) throw new Error('Workout required');
  if (!workout.name) throw new Error('Name required');
  if (!workout.segments) throw new Error('Segments required');
}

function validateSegment(segment) {
  if (!segment) throw new Error('Segment required');
  if (!segment.duration) throw new Error('Duration required');
  if (!segment.power) throw new Error('Power required');
}

// After: Shared validation utility
function validateRequired(obj, field, message) {
  if (!obj[field]) throw new Error(message || `${field} required`);
}

function validateWorkout(workout) {
  validateRequired(workout, 'name');
  validateRequired(workout, 'segments');
}
```

#### Circular Dependencies

```javascript
// Before: Circular dependency
// file-a.js
import { funcB } from './file-b.js';
export function funcA() {
  return funcB();
}

// file-b.js
import { funcA } from './file-a.js';
export function funcB() {
  return funcA();
}

// After: Extract shared dependency
// shared.js
export function sharedFunction() {
  /* implementation */
}

// file-a.js
import { sharedFunction } from './shared.js';
export function funcA() {
  return sharedFunction();
}

// file-b.js
import { sharedFunction } from './shared.js';
export function funcB() {
  return sharedFunction();
}
```

## 📋 Quality Checklist

### Before Committing

- [ ] Run `npm run lint:all` - No linting errors
- [ ] Run `npm run test:run` - All tests pass
- [ ] Run `npm run quality:dependencies` - No circular dependencies
- [ ] Check complexity warnings in IDE
- [ ] Review any duplicate code warnings

### Before PR Review

- [ ] Run `npm run quality:report` - Generate fresh quality report
- [ ] Review complexity metrics for changed files
- [ ] Check for new duplicate code
- [ ] Verify test coverage didn't decrease
- [ ] Document any intentional technical debt

### Sprint Planning

- [ ] Review quality reports from previous sprint
- [ ] Identify highest priority technical debt
- [ ] Allocate time for quality improvements
- [ ] Set quality targets for new features

## 🚀 Continuous Improvement

### Monitoring Trends

- Track maintainability index over time
- Monitor complexity growth in core modules
- Watch for duplicate code accumulation
- Measure test coverage trends

### Automation

- Pre-commit hooks enforce basic quality rules
- CI/CD pipeline runs full quality analysis
- Quality metrics tracked in each PR
- Automatic alerts for critical quality issues

### Team Practices

- Code review checklist includes quality metrics
- Refactoring sprints scheduled regularly
- Quality improvement goals in team OKRs
- Knowledge sharing on quality patterns

---

## 📚 Resources

- [Cyclomatic Complexity Explained](https://en.wikipedia.org/wiki/Cyclomatic_complexity)
- [Maintainability Index Guide](https://docs.microsoft.com/en-us/visualstudio/code-quality/code-metrics-values)
- [Technical Debt Management](https://martinfowler.com/bliki/TechnicalDebt.html)
- [Clean Code Principles](https://clean-code-developer.com/)

For questions about code quality practices, see the [Contributing Guide](../CONTRIBUTING.md) or create an issue.
