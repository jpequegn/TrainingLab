# Local CI/CD Workflow Documentation

## Overview

This project uses local CI/CD through Git hooks instead of GitHub Actions to ensure code quality and prevent issues before they reach the remote repository.

## Architecture

### Pre-Commit Hook (Quality Gates)

Runs automatically on every `git commit`:

1. **Staged Files Check** - Validates files are staged for commit
2. **Formatting & Linting** - Runs `lint-staged` with auto-fixes
3. **TypeScript Type Checking** - Validates all TypeScript files
4. **Security Audit** - Quick security vulnerability check
5. **Python Linting** - Runs Python linting if `.py` files are staged
6. **Unit Tests** - Executes full unit test suite
7. **Build Validation** - Ensures code compiles successfully

**Exit Policy**: Commit fails if any step fails (except security audit warnings)

### Pre-Push Hook (Comprehensive Validation)

Runs automatically on `git push` with branch-specific logic:

#### Main Branch (Production)

- Comprehensive linting (JS/TS/Python)
- Full test suite with coverage
- Production build validation
- End-to-end tests
- Code quality analysis
- **Strictest validation** - all must pass

#### Develop Branch (Integration)

- Standard linting
- Full test suite
- Build validation
- Basic E2E tests (warnings allowed)

#### Feature Branches

- Standard linting
- TypeScript checking
- Unit tests
- Build validation

### Security Features

- Security audit on every commit/push
- Dependency checking
- Uncommitted changes detection
- Branch-aware validation levels

## Commands

### Testing Hooks Locally

```bash
# Test pre-commit hooks
npm run hooks:test

# Skip hooks temporarily (use sparingly)
git commit --no-verify
git push --no-verify
```

### Quality Commands

```bash
# Run all quality checks manually
npm run lint:all
npm run test:coverage
npm run build
npm run test:e2e

# Individual checks
npm run lint
npm run type-check
npm run test:run
```

## Benefits vs GitHub Actions

### Advantages

✅ **Fast Feedback** - Immediate validation before commit/push
✅ **No Network Required** - Works offline
✅ **Cost-Free** - No CI/CD minutes consumed
✅ **Consistent Environment** - Same environment as development
✅ **Prevents Bad Commits** - Catches issues before they reach remote
✅ **Developer-Centric** - Integrated into git workflow

### Considerations

⚠️ **Local Environment Dependent** - Results may vary by machine
⚠️ **No Build Artifacts** - No centralized build outputs
⚠️ **Bypass Possible** - Developers can use `--no-verify`

## Workflow Examples

### Typical Development Flow

```bash
# Make changes
vim src/components/MyComponent.js

# Add files
git add .

# Commit triggers pre-commit hook
git commit -m "Add new feature"
# → Runs formatting, linting, type checking, tests, build

# Push triggers pre-push hook
git push origin feature/my-feature
# → Runs feature branch validation
```

### Main Branch Deployment

```bash
# Switch to main
git checkout main

# Merge feature
git merge feature/my-feature

# Push triggers comprehensive validation
git push origin main
# → Runs FULL validation suite including E2E tests
```

## Troubleshooting

### Common Issues

#### Tests Failing

```bash
# Fix test issues first
npm run test:run

# Then commit
git commit -m "Fix tests"
```

#### Linting Errors

```bash
# Auto-fix most issues
npm run lint:fix

# Manual fixes for remaining issues
# Then commit
```

#### Build Errors

```bash
# Check TypeScript errors
npm run type-check

# Fix build issues
# Then commit
```

#### Hook Permission Issues (Linux/Mac)

```bash
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

### Emergency Bypass

```bash
# Only use in emergencies
git commit --no-verify -m "Emergency fix"
git push --no-verify
```

## Configuration Files

- `.husky/pre-commit` - Pre-commit hook script
- `.husky/pre-push` - Pre-push hook script
- `.lintstagedrc.json` - Lint-staged configuration
- `package.json` - NPM scripts for all quality checks

## Migration from GitHub Actions

### What Was Moved

- Security auditing → Pre-commit/pre-push hooks
- Linting → Pre-commit hook
- Testing → Pre-commit/pre-push hooks
- Build validation → Pre-commit/pre-push hooks
- E2E testing → Pre-push hook (main/develop branches)

### What Was Disabled

- `.github/workflows/ci.yml` → `.github/workflows-disabled/ci.yml`
- `.github/workflows/dependency-security.yml` → `.github/workflows-disabled/dependency-security.yml`

### Restoration (if needed)

```bash
# Restore GitHub Actions if needed
mv .github/workflows-disabled/* .github/workflows/
```

## Performance

### Typical Hook Execution Times

- **Pre-commit**: 30-90 seconds (depending on test suite size)
- **Pre-push (feature)**: 60-120 seconds
- **Pre-push (main)**: 3-8 minutes (includes E2E tests)

### Optimization Tips

- Keep unit tests fast and focused
- Use test parallelization where possible
- Consider test sharding for large suites
- Cache dependencies and build outputs

## Best Practices

1. **Run Quality Checks Frequently** - Don't wait for hooks
2. **Keep Tests Fast** - Optimize test performance
3. **Fix Issues Immediately** - Don't accumulate technical debt
4. **Use Meaningful Commits** - Hooks validate each commit
5. **Test Locally First** - Run `npm run test:run` before committing
6. **Monitor Hook Performance** - Keep execution times reasonable

---

_Generated: 2025-01-04_  
_Local CI/CD replaces GitHub Actions for improved developer experience_
