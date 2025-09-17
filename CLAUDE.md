# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Postman.gov.sg is Singapore's official government messaging platform that enables government agencies to send email, SMS, and Telegram messages to citizens. It's built as a monorepo with 5 main packages:

- `backend/` - Node.js API server with Express, Sequelize ORM, PostgreSQL
- `frontend/` - React 18 web application with TypeScript and SASS
- `shared/` - Common utilities, email templating, and shared types
- `worker/` - Background job processing for message sending via queues
- `e2e/` - Playwright end-to-end tests
- `sst/` - Serverless deployment configuration for AWS

Production runs on AWS using Elastic Beanstalk, Amplify, ECS, and Lambda.

## Development Commands

**Initial Setup:**
```bash
npm install
npm run dev:services  # Start PostgreSQL, Redis via Docker
npm run db:migrate    # Run database migrations
npm run dev          # Start all services in development
```

**Testing:**
```bash
npm test                    # Run Jest unit tests across all packages
npm run test:e2e           # Run Playwright E2E tests
npm run test:e2e:headed    # Run E2E tests in headed mode
```

**Linting & Quality:**
```bash
npm run precommit     # Comprehensive pre-commit checks (lint, type-check, format)
npm run lint          # ESLint across all packages
npm run lint:fix      # Auto-fix linting issues
```

**Database:**
```bash
npm run db:migrate           # Run pending migrations
npm run db:migrate:undo      # Undo last migration
npm run db:seed              # Seed database with sample data
```

**Package-specific commands:**
```bash
npm run backend:dev     # Start backend only
npm run frontend:dev    # Start frontend only  
npm run worker:dev      # Start worker only
```

## Architecture & Tech Stack

**Backend (`backend/`):**
- Node.js + TypeScript + Express
- Sequelize ORM with PostgreSQL 11
- Redis for caching and session storage
- Module aliases: `@core`, `@email`, `@sms`, `@telegram`, `@govsg`
- Structure: `routes/` → `middlewares/` → `services/` → `models/`

**Frontend (`frontend/`):**
- React 18 + TypeScript
- SASS for styling with CSS modules
- Lingui for internationalization (i18n)
- Module aliases for clean imports

**Worker (`worker/`):**
- Background job processing system
- Handles email, SMS, and Telegram message sending
- Queue-based architecture for reliable message delivery

**Shared (`shared/`):**
- Common TypeScript types and interfaces
- Email templating system with Handlebars
- Shared utilities across packages

## Key Patterns

**Multi-channel Messaging:**
- Email campaigns via AWS SES
- SMS via Twilio integration  
- Telegram via Bot API
- GovSG link shortening integration

**Module Structure:**
- Each channel (email, SMS, telegram) has dedicated routes, services, and models
- Shared authentication and rate limiting middleware
- Service layer abstracts business logic from routes
- Models use Sequelize for database operations

**Security:**
- `detect-secrets` for credential scanning
- Rate limiting per user/IP
- Authentication middleware with session management
- Environment-based configuration (never commit secrets)

## Database Schema

PostgreSQL with key tables:
- `users` - Government agency users
- `campaigns` - Email/SMS campaign metadata
- `messages` - Individual message records  
- `credentials` - Channel-specific API credentials
- `templates` - Reusable message templates

Migrations are in `backend/src/database/migrations/` and use Sequelize CLI.

## Testing Strategy

**Unit Tests (Jest):**
- Located in `__tests__/` directories within each package
- Focus on services, utilities, and components
- Mock external dependencies (AWS, Twilio, etc.)

**E2E Tests (Playwright):**
- Located in `e2e/tests/`
- Test complete user workflows
- Run against local development environment

## Important Notes

- **Package Manager:** Uses `npm` (not pnpm) - follow existing patterns
- **Node Version:** Check `.nvmrc` for required Node.js version
- **Environment:** Copy `.env.example` files and configure for local development
- **Docker:** PostgreSQL and Redis run via `npm run dev:services`
- **Hot Reload:** Both frontend and backend support hot reloading in dev mode
- **Deployment:** Production uses AWS services, staging via pull request previews