# Contribution Guidelines

## Getting Started

### Prerequisites
- Node.js >= 20.19.0
- PostgreSQL database
- Supabase account (for authentication)

### Initial Setup

1. **Fork the repository**
   ```bash
   git fork https://github.com/mauriciobc/mealtime-react.git
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mealtime-react.git
   cd mealtime-react
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Setup database**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming
- `feature/` - New features (e.g., `feature/user-notifications`)
- `bugfix/` - Bug fixes (e.g., `bugfix/feeding-log-error`)
- `hotfix/` - Critical production fixes (e.g., `hotfix/security-patch`)
- `docs/` - Documentation updates (e.g., `docs/update-api-docs`)
- `refactor/` - Code refactoring (e.g., `refactor/authentication-module`)

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, semicolons, etc.)
- `refactor:` Code refactoring
- `test:` Adding or modifying tests
- `chore:` Maintenance tasks

### Code Review Process
1. Create a pull request to the `main` branch
2. Ensure all checks pass (lint, typecheck, tests)
3. Request review from maintainers
4. Address feedback and squash commits

## Code Style

### TypeScript
- All new code must use TypeScript
- Enable `strict` mode in tsconfig.json
- Use explicit types over `any`
- Prefer interfaces over types for object shapes

### React Components
- Use functional components with hooks
- Prefix custom hooks with `use`
- Use `memo` for expensive components
- Follow the component structure:
  ```
  components/
  ├── ui/           # Base UI components (shadcn/ui)
  ├── features/     # Feature-specific components
  └── layout/       # Layout components
  ```

### API Routes
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Return consistent JSON responses using `ApiResponse` class
- Validate input using Zod schemas
- Use the `withAuth` helper for protected routes

### Database
- Use Prisma ORM with TypeScript
- Add proper indexes for frequently queried fields
- Use migrations for schema changes
- Add comments for complex queries

## Testing

### E2E Tests (Playwright)
```bash
# Run all tests
npm run test:e2e

# Run specific test
npm run test:e2e:cats

# Run with UI
npm run test:e2e:ui
```

### Unit Tests
Add unit tests for:
- Repository layer functions
- Service layer functions
- Utility functions
- Validation schemas

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `DIRECT_URL` | Direct PostgreSQL connection | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | No |

## Submitting Changes

1. **Ensure all checks pass**
   ```bash
   npm run lint
   npm run typecheck
   npm run test:e2e
   ```

2. **Update documentation**
   - Update README.md if adding new features
   - Add JSDoc comments to new functions
   - Update API documentation if endpoints change

3. **Create pull request**
   - Fill out the PR template
   - Link related issues
   - Provide clear description of changes

## Reporting Issues

- Use the issue template
- Include steps to reproduce
- Add relevant logs and screenshots
- Specify environment details (OS, Node version, etc.)
