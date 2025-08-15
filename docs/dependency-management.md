# 📦 Dependency Management & Security

This document outlines the dependency management strategy, automation tools, and security practices for the WkoLibrary project.

## 🔄 Automated Dependency Updates

### Dependabot Configuration

**Location**: `.github/dependabot.yml`

Dependabot automatically creates pull requests for dependency updates according to the following schedule:

| Package Type        | Schedule                 | Grouping                                  | Auto-merge             |
| ------------------- | ------------------------ | ----------------------------------------- | ---------------------- |
| **NPM packages**    | Weekly (Monday 9AM UTC)  | By category (ESLint, TypeScript, Testing) | Patch & minor dev deps |
| **Python packages** | Weekly (Tuesday 9AM UTC) | AI/ML packages grouped                    | Patch updates          |
| **GitHub Actions**  | Monthly (1st Monday)     | Individual updates                        | Security patches       |
| **Docker**          | Monthly                  | Individual updates                        | Security patches       |

### Dependency Groups

**JavaScript/TypeScript**:

- `eslint`: All ESLint-related packages
- `typescript`: TypeScript and @types packages
- `testing`: Test frameworks (Vitest, Playwright)
- `build-tools`: Development tools (Prettier, Husky, etc.)

**Python**:

- `ai-packages`: LangChain, OpenAI, AI-related libraries
- `dev-tools`: Development utilities

### Auto-merge Rules

**Automatic approval for**:

- Patch updates for production dependencies
- Minor and patch updates for development dependencies
- Indirect dependency patches

**Manual review required for**:

- Major version updates
- Critical production dependencies
- Security-sensitive packages

## 🛠️ Manual Dependency Management

### Available Commands

```bash
# Check for outdated packages
npm run deps:check

# Update to latest compatible versions
npm run deps:update

# Update to latest versions (including major)
npm run deps:update:major

# Security audit (moderate level)
npm run deps:audit

# Fix security vulnerabilities automatically
npm run deps:audit:fix

# Production security scan (high severity)
npm run deps:security

# Clean install (troubleshooting)
npm run deps:clean
```

### Monthly Dependency Review Process

1. **Check outdated packages**:

   ```bash
   npm run deps:check
   ```

2. **Review security issues**:

   ```bash
   npm run deps:audit
   ```

3. **Test major updates in feature branch**:

   ```bash
   git checkout -b update/major-dependencies
   npm run deps:update:major
   npm test
   npm run quality:all
   ```

4. **Update documentation if needed**
5. **Create PR with comprehensive testing**

## 🔒 Security Management

### Security Scanning

**Automated Scans**:

- Dependabot security advisories
- GitHub security alerts
- npm audit in CI/CD pipeline
- Pre-commit security checks

**Manual Security Audits**:

```bash
# Full security audit
npm run deps:security

# Check for high/critical vulnerabilities
npm audit --audit-level=high

# Python security scan (if configured)
pip-audit  # (requires pip-audit installation)
```

### Security Policies

**Immediate Action Required**:

- Critical severity vulnerabilities
- High severity in production dependencies
- Known exploits in the wild

**Planned Updates** (within 1 week):

- High severity in development dependencies
- Moderate severity with available patches

**Monitoring Only**:

- Low severity vulnerabilities
- Development-only dependencies with no patches

### Vulnerability Response Process

1. **Assessment**:
   - Determine if vulnerability affects production code
   - Assess exploitability in current context
   - Check if patches are available

2. **Immediate Actions**:
   - Apply available patches
   - Remove unused vulnerable dependencies
   - Implement workarounds if needed

3. **Communication**:
   - Document security decisions
   - Update team on critical issues
   - Track remediation progress

## 📋 Dependency Guidelines

### Adding New Dependencies

**Before adding any dependency**:

1. **Evaluate necessity**:
   - Can functionality be implemented without dependency?
   - Does it solve a critical problem?
   - Is the dependency actively maintained?

2. **Security assessment**:
   - Check recent security history
   - Review maintainer reputation
   - Verify download statistics and community trust

3. **Compatibility check**:
   - Node.js version compatibility
   - TypeScript support
   - Browser compatibility (for frontend dependencies)

4. **Bundle size impact**:
   - Analyze bundle size increase
   - Check for tree-shaking support
   - Consider performance implications

### Dependency Selection Criteria

**Production Dependencies** (extra strict):

- ✅ Actively maintained (updates within 6 months)
- ✅ Large community adoption (>1M weekly downloads)
- ✅ Good security track record
- ✅ Stable API (mature package)
- ✅ TypeScript support or @types available
- ✅ Minimal transitive dependencies

**Development Dependencies** (moderate standards):

- ✅ Solves development pain point
- ✅ Well-documented and supported
- ✅ Integrates with existing toolchain
- ✅ Reasonable bundle size if affects build

### Version Pinning Strategy

**Production Dependencies**:

- Use caret (^) for patch and minor updates
- Pin major versions explicitly
- Test thoroughly before updating

**Development Dependencies**:

- Use caret (^) for most tools
- Pin versions for critical build tools
- More flexible update policy

```json
{
  "dependencies": {
    "critical-lib": "^2.1.0", // Allow minor updates
    "stable-api": "2.0.0" // Pinned major version
  },
  "devDependencies": {
    "build-tool": "^1.5.0", // Flexible updates
    "test-runner": "3.2.1" // Pinned if needed for stability
  }
}
```

## 🚨 Troubleshooting

### Common Issues

**Conflicting Dependencies**:

```bash
# Check dependency tree
npm ls

# Force resolution (use carefully)
npm install --force

# Clean install
npm run deps:clean
```

**Security Audit Failures**:

```bash
# Review all vulnerabilities
npm audit

# Attempt automatic fixes
npm run deps:audit:fix

# Manual fix for unfixable issues
npm audit --audit-level=moderate
```

**Outdated Lock File**:

```bash
# Remove lock file and reinstall
rm package-lock.json
npm install

# Or use the clean command
npm run deps:clean
```

### Emergency Procedures

**Critical Vulnerability Discovered**:

1. Immediately assess impact scope
2. Apply hotfix if available
3. Remove dependency if no fix exists
4. Deploy emergency patch
5. Monitor for exploitation attempts

**Dependency Supply Chain Attack**:

1. Identify affected versions
2. Pin to known-good versions
3. Review recent commits and releases
4. Consider alternative packages
5. Report to security team

## 📊 Dependency Metrics

### Key Performance Indicators

**Security Metrics**:

- Number of vulnerabilities by severity
- Time to patch critical vulnerabilities
- Percentage of dependencies with known vulnerabilities

**Maintenance Metrics**:

- Percentage of outdated dependencies
- Average age of dependencies
- Number of major version updates pending

**Quality Metrics**:

- Bundle size impact of dependencies
- Number of transitive dependencies
- Dependency freshness score

### Monitoring Dashboard

Create regular reports tracking:

- Monthly security scan results
- Dependency update frequency
- Bundle size trends
- Breaking changes from updates

## 🔧 Automation Best Practices

### Pre-commit Hooks

Include dependency checks in pre-commit pipeline:

```bash
# Check for high-severity vulnerabilities
npm audit --audit-level=high --production

# Verify package-lock.json is up to date
npm ci --dry-run
```

### CI/CD Integration

Integrate dependency checks in continuous integration:

- Run security audits on every PR
- Block deployment if critical vulnerabilities exist
- Generate dependency update reports
- Track bundle size changes

### Automated Monitoring

Set up alerts for:

- New security advisories for used packages
- Outdated dependencies (monthly review)
- Failed dependency updates
- Bundle size increases > 10%

---

## 📚 Resources

- [npm Security Best Practices](https://docs.npmjs.com/security)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [OWASP Dependency Management](https://owasp.org/www-project-dependency-check/)
- [Node.js Security Working Group](https://github.com/nodejs/security-wg)

For dependency-related questions, see the [Contributing Guide](../CONTRIBUTING.md) or create a security issue.
