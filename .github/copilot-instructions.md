# Postman.gov.sg Development Instructions

Always reference these instructions first and fallback to search or additional context gathering only when you encounter unexpected information that does not match the info here.

## Project Overview

Postman.gov.sg is a Node.js application with multiple components:
- **Frontend**: React 18 application built with Create React App (port 3000)
- **Backend**: Express.js TypeScript API server (port 4000)  
- **Worker**: Background job processing service
- **Shared**: Common TypeScript modules used across components
- **SST**: Serverless Stack infrastructure code
- Database: PostgreSQL 11+ with Redis cache
- Node.js version: 18.15.0 (specified in .nvmrc)

## Prerequisites and Environment Setup

### Install Required Tools
```bash
# Install Node.js 18.15.0 (REQUIRED - other versions may cause issues)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 18.15.0
nvm use 18.15.0

# Install secrets detection tool (REQUIRED for commits)
pip install detect-secrets==1.2.0
```

### Environment Variables Setup
```bash
# Copy environment templates and configure
cp backend/.env-example backend/.env
cp frontend/.env-example frontend/.env

# Edit backend/.env with these REQUIRED values for local development:
BACKEND_URL="http://localhost:4000"
TWILIO_CALLBACK_SECRET="abcde"  
EMAIL_CALLBACK_HASH_SECRET="abcde"
# Add other required values from .env-example - see backend/.env-example for full list
```

## Build and Development Workflow

### Bootstrap the Project (FIRST TIME SETUP)
```bash
# Start required services (PostgreSQL and Redis)
docker compose up -d    # Takes ~30-60 seconds

# Install all dependencies - NEVER CANCEL, takes 2-3 minutes
SENTRYCLI_SKIP_DOWNLOAD=1 npm install    # Note: Sentry CLI may fail due to network restrictions

# Build shared components FIRST (REQUIRED)
cd shared && npm run build    # Takes ~12 seconds
cd ..

# Run database migrations (requires Docker services running)
cd backend
npm run build    # Takes ~20 seconds
npm run db:migrate    # Takes ~3-5 seconds (may fail if missing env vars)
cd ..
```

### Build Commands - NEVER CANCEL
```bash
# Build all components - NEVER CANCEL, takes 2-3 minutes total, set timeout to 300+ seconds
npm run build

# Note: Frontend build may fail in CI environments due to linting warnings being treated as errors
# For development builds, use: cd frontend && CI=false npm run build

# Individual component builds:
cd shared && npm run build    # ~12 seconds
cd backend && npm run build   # ~20 seconds
cd frontend && npm run compile && CI=false npm run build    # ~60 seconds (compile <1 sec, build ~60 sec)
```

### Running the Application
```bash
# Start all services in development mode - NEVER CANCEL
npm run dev    # Starts frontend, backend, shared, and workers concurrently

# Individual services:
cd backend && npm run dev     # Backend API server on port 4000
cd frontend && npm run dev    # Frontend React app on port 3000
cd shared && npm run dev      # Watch mode for shared components
```

## Testing - NEVER CANCEL

### Run All Tests - NEVER CANCEL, set timeout to 300+ seconds
```bash
npm test    # Runs all component tests concurrently, takes 2-3 minutes total
```

### Individual Test Suites
```bash
cd backend && npm test    # Takes ~2 minutes, NEVER CANCEL, set timeout to 200+ seconds
cd shared && npm test     # Takes <10 seconds
cd frontend && npm test   # React tests (may require frontend dependencies)
cd e2e && npm test        # End-to-end Playwright tests (requires separate setup)
```

## Linting and Code Quality

### Lint All Code
```bash
npm run lint-no-fix         # Check formatting only (~2 seconds)
npm run lint                # Fix formatting issues
npm run precommit           # Run all pre-commit checks (~45 seconds)
```

### Individual Component Linting
```bash
cd backend && npm run lint-no-fix    # ~30 seconds for TypeScript + ESLint
cd frontend && npm run lint-no-fix   # TypeScript + ESLint + Prettier
cd shared && npm run lint-no-fix     # Quick TypeScript check
```

## Validation Requirements

### ALWAYS Validate Changes By:
1. **Building the affected components**: Run `npm run build` after code changes
2. **Running relevant tests**: Execute `npm test` or component-specific tests
3. **Linting code**: Run `npm run lint-no-fix` before committing
4. **Testing core functionality**: 
   - Start the development server with `npm run dev`
   - Verify frontend loads at http://localhost:3000
   - Verify backend API responds at http://localhost:4000/v1/campaigns (should return 401 unauthorized for unauthenticated requests)
   - Test database connectivity by running a migration: `cd backend && npm run db:migrate`

### Manual End-to-End Validation Scenario
After making changes, ALWAYS:
1. Build: `npm run build` (NEVER CANCEL - 180+ seconds)
2. Test: `npm test` (NEVER CANCEL - 180+ seconds) 
3. Lint: `npm run precommit` (45+ seconds)
4. Manual verification: 
   - Start services: `docker compose up -d` (wait 30+ seconds)
   - Run migration: `cd backend && npm run db:migrate` 
   - Start backend: `cd backend && npm run dev` (verify "Listening on port 4000!" message)
   - Test API: `curl http://localhost:4000/v1/campaigns` (should return HTTP 401)
5. **Frontend development builds**: Use `CI=false` to avoid CI linting restrictions

## Common Issues and Solutions

### Dependency Installation Issues
- **Sentry CLI fails**: Use `SENTRYCLI_SKIP_DOWNLOAD=1 npm install` 
- **Frontend legacy peer deps**: Use `npm install --legacy-peer-deps` in frontend directory
- **Frontend install with scripts disabled**: Use `npm install --legacy-peer-deps --ignore-scripts` in frontend directory
- **Build errors after git pull**: Always run `cd shared && npm run build` first

### Database Issues
- **Migration failures**: Ensure Docker services are running and .env has all required values
- **Connection refused**: Run `docker compose up -d` and wait 30+ seconds for services to start
- **Missing environment variables**: Copy from .env-example and configure required fields (see Environment Variables Setup section)

### Build Issues  
- **TypeScript errors**: Ensure shared components are built first: `cd shared && npm run build`
- **Module not found**: Run `npm install` in the specific component directory
- **Frontend CI linting errors**: Use `CI=false npm run build` for development builds
- **WhatsApp-related build failures**: Add dummy values for WhatsApp auth tokens in backend/.env

## Project Structure Reference

```
├── frontend/          # React application (port 3000)
├── backend/           # Express API server (port 4000)  
├── worker/            # Background job processing
├── shared/            # Common TypeScript modules
├── sst/               # Serverless infrastructure
├── e2e/               # Playwright end-to-end tests
├── scripts/           # Utility scripts
└── docs/              # Documentation
```

### Key Files
- `package.json` - Root package with orchestration scripts
- `.nvmrc` - Required Node.js version (18.15.0)
- `docker-compose.yml` - Local PostgreSQL and Redis services
- `.github/workflows/ci.yml` - CI pipeline reference

## Timeout Guidelines - CRITICAL

**NEVER CANCEL these operations - set appropriate timeouts:**

- `npm install`: 180+ seconds timeout
- `npm run build`: 300+ seconds timeout (frontend build takes ~60 seconds)
- `npm test`: 300+ seconds timeout
- `cd backend && npm test`: 200+ seconds timeout
- Database migrations: 60+ seconds timeout
- `npm run precommit`: 90+ seconds timeout
- Docker services startup: 60+ seconds timeout

**Quick operations (<30 seconds):**
- Individual component builds
- Linting (except backend which takes ~30s)
- Database migrations (when properly configured)

## CI/CD Reference

The CI pipeline (`.github/workflows/ci.yml`) runs:
1. Lint checks with prettier and detect-secrets
2. Individual component tests with Node.js 18.15.0
3. PostgreSQL and Redis services for backend tests
4. Shared component build before other component tests

Always ensure your changes pass these same steps locally before committing.