# TrainingLab Source Code

This directory contains the modular source code for TrainingLab.

## Architecture

```
src/
├── core/                 # Core business logic
│   ├── models/          # Data models & types
│   ├── services/        # Business services
│   └── utils/           # Shared utilities
├── features/            # Feature modules
│   ├── workouts/        # Workout management
│   ├── training/        # Training analytics
│   ├── planning/        # Training planning
│   ├── social/          # Social features
│   └── settings/        # User settings
├── infrastructure/      # Technical infrastructure
│   ├── api/            # API clients
│   ├── storage/        # Data persistence
│   └── auth/           # Authentication
├── ui/                  # UI components
│   ├── components/      # Reusable components
│   ├── layouts/         # Page layouts
│   └── themes/          # Theming system
└── types/              # Global TypeScript types
```

## Development

- All new code should be TypeScript
- Follow the modular architecture
- Place domain logic in appropriate feature modules
- Keep infrastructure separate from business logic
- Use the existing component library in `ui/components`

## Migration Status

This structure is being gradually implemented. Legacy JavaScript files are being migrated to TypeScript and reorganized into this structure.
