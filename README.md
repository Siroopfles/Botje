# Botje - Discord Cleaning Management System

A Discord bot with web dashboard for managing cleaning tasks and schedules within communities.

## Features

- Discord bot for task management
- Web dashboard for administration
- Automated task rotation
- Real-time notifications
- Schedule management
- Performance tracking
- Role-based permissions
- Automated cleanup
- Rate limiting

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

## Command System

### Available Commands

- `/roles` - Role management and synchronization
  - `init` - Initialize default roles
  - `create` - Create a new role
  - `delete` - Delete a role
  - `edit` - Modify role settings
  - `assign` - Assign role to user
  - `list` - View available roles
  - `sync` - Synchronize with Discord roles

- `/stats` - System statistics and metrics
  - View performance metrics and system statistics

- `/settings` - Server configuration
  - Configure server-wide settings and preferences

- `/tasks` - Task management
  - `create` - Create a new task
  - `edit` - Modify task details
  - `delete` - Remove a task
  - `assign` - Assign task to user
  - `complete` - Mark task as completed
  - `list` - View tasks

- `/usersettings` - User preferences
  - `view` - View current settings
  - `notifications` - Configure notification preferences

- `/test` - Testing utilities
  - `notification` - Test notification system
  - `system` - System utilities (includes ping)

### Command Structure

All commands follow a standardized structure:
```
commands/
└── commandName/
    ├── index.ts         # Command registration
    ├── types.ts         # Type definitions
    ├── utils.ts         # Shared utilities
    └── handlers/        # Command handlers
        ├── index.ts     # Handler exports
        └── ...Handler.ts # Individual handlers
```

## Permission System

The bot uses role-based access control with three default roles:

### Default Roles
- **Admin**: Full system access
- **Moderator**: Task and notification management
- **User**: Basic task operations

### Setting Up Roles
```bash
# Initialize default roles
/roles init

# Create custom role
/roles create name:"Custom Role" permissions:CREATE_TASK,VIEW_ALL_TASKS

# Assign role
/roles assign user:@username role-id:123456789
```

### Task Permissions
- CREATE_TASK: Create new tasks
- EDIT_ANY_TASK: Edit any task
- EDIT_OWN_TASK: Edit assigned tasks
- DELETE_ANY_TASK: Delete any task
- DELETE_OWN_TASK: Delete assigned tasks
- VIEW_ALL_TASKS: View all tasks

### Management Permissions
- MANAGE_ROLES: Create and delete roles
- ASSIGN_ROLES: Assign existing roles
- MANAGE_SERVER_SETTINGS: Configure server settings
- MANAGE_NOTIFICATIONS: Configure notification settings

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