# GitHub Copilot Instructions for Postman.gov.sg

This document provides comprehensive setup instructions and development guidelines for GitHub Copilot when working on the Postman.gov.sg codebase.

## Repository Overview

Postman.gov.sg is a TypeScript/Node.js monorepo that enables public officers to send templated messages to many recipients via email, SMS, and Telegram. The application consists of:

- **Backend** (`/backend`): Express.js API server with PostgreSQL database
- **Frontend** (`/frontend`): React.js web application
- **Worker** (`/worker`): Background job processors for message sending and logging
- **Shared** (`/shared`): Common utilities and types used across all modules
- **E2E** (`/e2e`): End-to-end tests using Playwright

## Architecture & Technology Stack

### Core Technologies

- **Language**: TypeScript
- **Backend**: Node.js, Express.js, Sequelize ORM
- **Frontend**: React.js, Chakra UI, React Query
- **Database**: PostgreSQL
- **Cache/Queue**: Redis
- **Testing**: Jest (unit), Playwright (e2e)
- **Build**: TypeScript compiler, Webpack (frontend)
- **Containerization**: Docker

### Key Dependencies

- **Authentication**: Passport.js with SGID integration
- **Validation**: Joi for request validation
- **Email**: Nodemailer, AWS SES
- **SMS**: AWS SNS, Twilio
- **Telegram**: Bot API
- **Monitoring**: Sentry, Datadog
- **File Storage**: AWS S3

## Development Environment Setup

### Prerequisites

- Node.js (see `.nvmrc` for version)
- Docker and Docker Compose
- PostgreSQL 13+
- Redis 6+

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start required services
npm run dev:services  # Starts PostgreSQL and Redis via Docker

# 3. Set up environment variables
cp backend/.env-example backend/.env
cp frontend/.env-example frontend/.env
cp worker/.env-example worker/.env
cp .env-example .env

# 4. Run database migrations
cd backend && npm run db:migrate

# 5. Start development servers
npm run dev  # Starts all services concurrently
```

### Environment Variables

Each module requires specific environment variables:

- Database connection strings for PostgreSQL
- Redis connection details
- AWS credentials for SES, SNS, S3
- Third-party API keys (Twilio, Telegram)
- Authentication secrets

**Security Note**: Never commit `.env` files. Use `.env-example` files as templates.

## Code Organization & Patterns

### Directory Structure

```
/backend/src/
├── core/           # Core business logic, routes, middleware
├── database/       # Models, migrations, seeders
├── services/       # External service integrations
└── types/          # TypeScript type definitions

/frontend/src/
├── components/     # Reusable React components
├── contexts/       # React context providers
├── services/       # API client functions
├── classes/        # Business logic classes
└── locales/        # Internationalization

/shared/src/
├── templates/      # Message templates
├── utils/          # Common utilities
└── types/          # Shared TypeScript types

/worker/src/
├── core/           # Worker job definitions
├── services/       # Message sending logic
└── logger/         # Logging service
```

### Coding Conventions

#### TypeScript

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use enum for constants with multiple values
- Always type function parameters and return values

#### Backend API Patterns

- Use Joi for request validation in routes
- Follow RESTful API design principles
- Implement proper error handling with structured error responses
- Use middleware for authentication, validation, and logging

Example route pattern:

```typescript
router.post(
  "/campaigns",
  celebrate(createCampaignValidator),
  authMiddleware.requireUser,
  campaignMiddleware.createCampaign
);
```

#### Frontend Patterns

- Use React hooks (useState, useEffect, useContext)
- Implement proper loading states and error handling
- Use React Query for server state management
- Follow Chakra UI design system patterns

#### Database Patterns

- Use Sequelize ORM with proper model associations
- Always write migrations for schema changes
- Use transactions for multi-table operations
- Index frequently queried columns

### Local Module System

The project uses local npm modules to share code between packages:

```json
{
  "dependencies": {
    "postman-templating": "file:../shared"
  }
}
```

When updating shared modules:

1. Make changes in `/shared`
2. Run `npm run build` in shared module
3. Update parent module's `package-lock.json` if needed

## Testing Strategy

### Unit Tests

- **Location**: `src/**/__tests__/` or `src/**/*.test.ts`
- **Framework**: Jest with TypeScript support
- **Coverage**: Aim for >80% code coverage
- **Patterns**: Mock external dependencies, test business logic

### Integration Tests

- Test API endpoints with database interactions
- Use test database for isolation
- Clean up test data after each test

### End-to-End Tests

- **Location**: `/e2e`
- **Framework**: Playwright
- **Scope**: Critical user flows (authentication, campaign creation, message sending)

### Running Tests

```bash
# All tests
npm test

# Specific modules
npm run test:backend
npm run test:frontend
npm run test:shared
npm run test:e2e
```

## Build & Deployment

### Build Process

```bash
# Build all modules
npm run build

# Individual modules
npm run build:shared    # Must be built first
npm run build:backend
npm run build:worker
npm run build:frontend
```

### Development Commands

```bash
npm run dev                    # Start all services
npm run dev:backend           # Backend only
npm run dev:frontend          # Frontend only
npm run dev:worker:sender     # Message sender worker
npm run dev:worker:logger     # Logging worker
```

### Code Quality

- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Pre-commit**: Husky hooks run linting and secret detection
- **CI/CD**: GitHub Actions for testing and deployment

```bash
npm run precommit  # Run all quality checks
npm run lint       # Format code
```

## Security Considerations

### Secret Management

- Use environment variables for all secrets
- Never commit sensitive data
- Use `detect-secrets` tool for secret scanning
- Validate all user inputs with Joi

### Authentication & Authorization

- Implement proper session management
- Use CSRF protection
- Validate user permissions for all operations
- Implement rate limiting

### Data Protection

- Encrypt sensitive data in database
- Use HTTPS for all communications
- Implement proper logging without sensitive data
- Follow GDPR/data protection requirements

## Contributing Guidelines

### Pull Request Process

1. Create feature branch from `master`
2. Make focused, incremental changes
3. Write comprehensive tests
4. Update documentation if needed
5. Follow PR template and include demo videos
6. Request review from team members

### Code Review Standards

- Review for feature correctness first
- Check code structure and maintainability
- Mark style preferences with `[nit]`
- Provide constructive feedback with examples
- Test complex features locally

See [docs/pr-review-guidelines.md](../docs/pr-review-guidelines.md) for detailed guidelines.

### Common Issues & Solutions

#### Database Migrations

- Always test migrations on development data
- Use transactions for complex migrations
- Create rollback migrations when needed
- Update model definitions after schema changes

#### Message Sending

- Test with small batches first
- Implement proper retry logic
- Monitor rate limits for third-party services
- Use worker queues for large campaigns

#### Frontend State Management

- Use React Query for server state
- Implement optimistic updates carefully
- Handle loading and error states consistently
- Use context for global application state

## Useful Commands & Scripts

```bash
# Database operations
cd backend && npm run db:migrate        # Run migrations
cd backend && npm run db:migrate:undo   # Rollback migration
cd backend && npm run db:seed          # Run seeders

# Development utilities
npm run wait:backend                   # Wait for backend to be ready
npm run detect-secrets:update          # Update secrets baseline
sh check-env-format.sh               # Validate environment files

# Production utilities
npm run grafana                       # Start Grafana dashboard
cd backend && npm run tunneldb:staging # Connect to staging database
```

## Documentation References

- [README.md](../README.md) - Main project documentation
- [docs/CONTRIBUTING.md](../docs/CONTRIBUTING.md) - Contribution guidelines
- [docs/pr-review-guidelines.md](../docs/pr-review-guidelines.md) - PR review process
- [docs/local-module.md](../docs/local-module.md) - Local module system
- [docs/configure/](../docs/configure/) - Configuration guides for each module

## Troubleshooting

### Common Development Issues

1. **Build Failures**: Ensure shared module is built first
2. **Database Connection**: Verify PostgreSQL is running and environment variables are set
3. **Redis Connection**: Check Redis service status
4. **Frontend Dependencies**: Use `--legacy-peer-deps` flag for npm install
5. **Port Conflicts**: Check if services are running on expected ports (4000, 3000)

### Getting Help

- Check existing documentation first
- Review similar code patterns in the codebase
- Ask team members for guidance on complex features
- Test changes thoroughly in development environment

---

This repository follows semantic versioning and maintains high code quality standards. When in doubt, prefer smaller, incremental changes over large refactoring efforts.
