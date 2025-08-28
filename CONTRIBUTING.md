# 🤝 Contributing to Zwift Workout Visualizer

Welcome to the Zwift Workout Visualizer project! We're excited to have you contribute. This guide covers everything you need to know to get started and contribute effectively.

## 🚀 Quick Start

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/WkoLibrary.git
cd WkoLibrary

# Add upstream remote
git remote add upstream https://github.com/jpequegn/WkoLibrary.git
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (if working on backend)
pip install -r requirements.txt
```

### 3. Start Development Environment

```bash
# Start development server with hot reload
npm run dev

# Alternative: Start components separately
npm run dev:server    # Backend only
npm run dev:frontend  # Frontend only
```

Your browser will automatically open to `http://localhost:3001` with live reload enabled.

## 🏗️ Development Workflow

### Creating a Feature Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. **Write Code**: Follow our coding standards (automatically enforced)
2. **Test**: Run tests as you develop (`npm run test:watch`)
3. **Type Check**: Ensure TypeScript compliance (`npm run type-check:watch`)
4. **Format**: Code is automatically formatted on save and commit

### Quality Gates (Automated)

Our pre-commit hooks automatically run:

- **ESLint**: Code linting with auto-fix
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **Tests**: Unit test execution
- **Ruff**: Python linting (for .py files)

If any check fails, the commit is blocked. Fix the issues and try again.

### Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
type(scope): description

# Examples:
feat: add workout comparison feature
fix(parser): handle empty workout files correctly
docs: update API documentation
style: improve button hover effects
refactor(ui): extract common chart utilities
test: add edge cases for interval parsing
```

**Types:**

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style/UI changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding/updating tests
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Maintenance tasks

### Submitting Changes

```bash
# Ensure your branch is up to date
git fetch upstream
git rebase upstream/main

# Push your changes
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

## 🧪 Testing

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:run

# Watch mode (recommended during development)
npm run test:watch

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

### Writing Tests

- **Unit Tests**: Place in `tests/unit/`
- **Integration Tests**: Place in `tests/integration/`
- **E2E Tests**: Place in `tests/e2e/`

Example unit test:

```javascript
import { describe, it, expect } from 'vitest';
import { parseWorkoutXML } from '../parser.js';

describe('parseWorkoutXML', () => {
  it('should parse valid workout XML', () => {
    const xml = '...'; // Your test XML
    const result = parseWorkoutXML(xml);
    expect(result.name).toBe('Test Workout');
  });
});
```

## 📝 Code Style

### Automatic Formatting

Code is automatically formatted using Prettier:

- **On Save**: Configure your editor to format on save
- **Pre-commit**: Automatically formats staged files
- **Manual**: `npm run format`

### ESLint Rules

We enforce modern JavaScript/TypeScript practices:

- Prefer `const` over `let`
- Use template literals over string concatenation
- Prefer arrow functions
- No unused variables (warnings)
- Consistent error handling

### TypeScript

We're gradually migrating to TypeScript:

- New files should use `.ts`/`.tsx`
- Type definitions are in `src/types/`
- Run type checking: `npm run type-check`

## 🏛️ Architecture

### Project Structure

```
WkoLibrary/
├── src/                    # Source code (TypeScript)
│   └── types/             # TypeScript type definitions
├── components/            # UI components
├── utils/                 # Utility functions
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── e2e/              # End-to-end tests
│   └── fixtures/         # Test data
├── docs/                 # Documentation
├── config/               # Configuration files
└── server.py             # Python backend server
```

### Key Components

- **Parser** (`parser.js`): Zwift workout file parsing
- **Workout** (`workout.js`): Workout data processing and calculations
- **UI Components** (`components/`): Reusable UI elements
- **Chart Utils** (`chart-utils.js`): Chart.js integration
- **Themes** (`themes.js`): Dark/light theme management

### Data Flow

```
.zwo file → Parser → Workout Object → Chart Data → UI Rendering
```

## 🎨 Design System

We use **Nebula UI** design system:

- **Colors**: Dark theme with blue accent (`#1F4E8C`)
- **Typography**: Inter font, 8px grid system
- **Components**: Angular design (max 4px border radius)
- **Spacing**: Consistent 8px grid spacing

See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for complete guidelines.

## 🛠️ Available Scripts

### Development

```bash
npm run dev              # Full development server with hot reload
npm run dev:server       # Backend server only
npm run dev:frontend     # Frontend with live reload only
npm run dev:simple       # Basic server without hot reload
```

### Building & Type Checking

```bash
npm run build           # Compile TypeScript
npm run build:watch     # Watch mode compilation
npm run type-check      # Type check without compilation
npm run type-check:watch # Watch mode type checking
```

### Code Quality

```bash
npm run format          # Format all code
npm run format:check    # Check formatting
npm run lint            # Run ESLint
npm run lint:fix        # Auto-fix ESLint issues
npm run lint:ts         # TypeScript linting
npm run lint:py         # Python linting
npm run lint:all        # All linting and formatting checks
```

### Testing

```bash
npm run test            # Run tests in watch mode
npm run test:run        # Run tests once
npm run test:coverage   # Generate coverage report
npm run test:e2e        # Run end-to-end tests
npm run test:e2e:ui     # Run E2E tests with UI
```

### Hooks & Quality

```bash
npm run hooks:test      # Test pre-commit hooks
npm run hooks:skip      # Skip hooks for next commit
npm run audit           # Security audit
```

## 🐛 Debugging

### Development Tools

Development mode enables:

- **Error Overlay**: Runtime errors with detailed info
- **Performance Monitoring**: Page load metrics
- **Debug Logging**: Verbose console output
- **Hot Reload**: Instant updates on file changes

### Common Issues

**Hot Reload Not Working?**

```bash
# Check if you're using the proxy port
# Should be http://localhost:3001 (not 12000)

# Restart development server
npm run dev
```

**TypeScript Errors?**

```bash
# Check types without compilation
npm run type-check

# Fix auto-fixable issues
npm run lint:fix
```

**Tests Failing?**

```bash
# Run specific test file
npm test tests/unit/parser.test.js

# Run tests with coverage
npm run test:coverage
```

**Pre-commit Hooks Failing?**

```bash
# Test hooks without committing
npm run hooks:test

# Skip hooks (emergency only)
git commit --no-verify
```

## 🌟 Best Practices

### Code Quality

1. **Write Tests**: Include unit tests for new features
2. **Type Safely**: Use TypeScript types for new code
3. **Error Handling**: Include proper error boundaries
4. **Performance**: Consider performance implications
5. **Accessibility**: Follow WCAG guidelines

### Git Workflow

1. **Small Commits**: Make focused, atomic commits
2. **Clear Messages**: Use conventional commit format
3. **Test Before Push**: Ensure all tests pass
4. **Rebase**: Keep history clean with rebasing
5. **Review Ready**: Test thoroughly before PR

### UI/UX

1. **Design System**: Use Nebula UI components
2. **Responsive**: Test on different screen sizes
3. **Dark Theme**: Design for dark-first approach
4. **Loading States**: Provide feedback during operations
5. **Error States**: Handle and display errors gracefully

## 📚 Resources

### Documentation

- [DEVELOPMENT.md](DEVELOPMENT.md) - Detailed development setup
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) - UI design guidelines
- [docs/](docs/) - Implementation guides and examples

### External Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Testing](https://playwright.dev/)

## 🤔 Need Help?

### Getting Support

1. **Check Documentation**: Start with this guide and other docs
2. **Search Issues**: Look for existing GitHub issues
3. **Ask Questions**: Create a GitHub discussion
4. **Report Bugs**: Open a detailed issue with reproduction steps

### Issue Template

When reporting bugs, include:

- **Environment**: OS, browser, Node.js version
- **Steps to Reproduce**: Clear step-by-step instructions
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Console Logs**: Any error messages

## 🏆 Recognition

Contributors are recognized in:

- **GitHub Contributors**: Automatic recognition
- **Release Notes**: Major contributions highlighted
- **Hall of Fame**: Long-term contributors celebrated

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to Zwift Workout Visualizer! Your efforts help make this tool better for the entire cycling community. 🚴‍♂️💪

## 🎯 Quick Reference

### First-Time Contributors

1. Fork → Clone → `npm install` → `npm run dev`
2. Make changes → Test → Commit (follows conventional format)
3. Push → Create Pull Request

### Regular Development

```bash
git checkout main && git pull upstream main
git checkout -b feature/my-feature
# Make changes, commit automatically runs quality gates
git push origin feature/my-feature
# Create PR
```

### Emergency Fixes

```bash
# For urgent fixes that bypass some checks
git commit --no-verify -m "fix: urgent security patch"
```

Happy coding! 🎉
