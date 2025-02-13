# Botje - Discord Cleaning Management System

A Discord bot with web dashboard for managing cleaning tasks and schedules within communities.

## Features

- Discord bot for task management
- Web dashboard for administration
- Automated task rotation
- Real-time notifications
- Schedule management
- Performance tracking

## Development Setup

### Prerequisites

- Node.js >= 18.x
- MongoDB >= 6.x
- pnpm >= 8.x
- Discord application credentials

### Environment Setup

1. Create a Discord application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development
pnpm dev
```

### Discord Bot Development

```bash
# Run bot in development mode
pnpm dev:bot

# Deploy commands
pnpm --filter bot deploy-commands
```

## Project Structure

```
/
├── packages/                    # Monorepo packages
│   ├── api/                    # Backend API
│   ├── bot/                    # Discord bot
│   ├── web/                    # Web dashboard
│   ├── shared/                 # Shared utilities and types
│   └── database/              # Database models and migrations
├── docs/                      # Documentation
└── scripts/                   # Development scripts
```

## Available Scripts

- `pnpm build` - Build all packages
- `pnpm dev` - Start all services in development mode
- `pnpm dev:bot` - Start Discord bot in development mode
- `pnpm test` - Run all tests
- `pnpm clean` - Clean build artifacts and node_modules

## Contributing

1. Make sure to read the documentation in the `memory-bank/` directory
2. Follow the TypeScript coding standards
3. Write tests for new features
4. Update documentation as needed

## License

ISC