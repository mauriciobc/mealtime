# Development Best Practices Guide

## Project Architecture

### Directory Structure
```
mealtime/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── cats/          # Cat management endpoints
│   │   ├── feedings/      # Feeding log endpoints
│   │   ├── households/    # Household management
│   │   └── v2/            # API v2 endpoints
│   ├── cats/              # Cat pages
│   ├── feedings/          # Feeding pages
│   └── households/        # Household pages
├── components/            # React components
│   ├── ui/               # Base UI components (shadcn/ui)
│   ├── cats/             # Cat-specific components
│   ├── feeding/          # Feeding-specific components
│   └── providers/        # Context providers
├── lib/                   # Core library code
│   ├── actions/          # Server actions
│   ├── auth.ts           # Authentication utilities
│   ├── constants.ts      # Project constants
│   ├── dto/              # Data transfer objects
│   ├── hooks/            # Custom React hooks
│   ├── middleware/       # API middleware
│   ├── prisma.ts         # Prisma client
│   ├── repositories/     # Data access layer
│   ├── responses/        # API response utilities
│   ├── services/         # Business logic
│   ├── types/            # TypeScript types
│   ├── validations/      # Zod schemas
│   └── monitoring/       # Logging & monitoring
├── prisma/               # Database schema & migrations
├── tests/                # Playwright E2E tests
└── docs/                 # Documentation
```

## Code Standards

### 1. TypeScript Best Practices

#### Do's
```typescript
// ✅ Use explicit types
function getCatById(id: string): Promise<Cat | null> {
  return prisma.cats.findUnique({ where: { id } });
}

// ✅ Use interfaces for object shapes
interface CreateCatInput {
  name: string;
  householdId: string;
  weight?: number;
}

// ✅ Use discriminated unions for states
type LoadingState = { status: 'loading' } | { status: 'success'; data: Cat[] } | { status: 'error'; error: Error };
```

#### Don'ts
```typescript
// ❌ Avoid any
function processData(data: any) { ... }

// ❌ Avoid implicit any
const [state, setState] = useState(null);

// ❌ Avoid redundant type annotations
const name: string = 'Cat Name';
```

### 2. React Component Patterns

#### Component Structure
```typescript
'use client';

import { useState, useCallback, memo } from 'react';
import { useQuery } from '@tanstack/react-query';

interface CatCardProps {
  cat: Cat;
  onEdit: (cat: Cat) => void;
}

export const CatCard = memo(function CatCard({ cat, onEdit }: CatCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEdit = useCallback(() => {
    onEdit(cat);
  }, [cat, onEdit]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{cat.name}</CardTitle>
      </CardHeader>
      {/* Content */}
    </Card>
  );
});
```

#### Custom Hook Pattern
```typescript
// hooks/useCats.ts
export function useCats(householdId: string) {
  return useQuery({
    queryKey: ['cats', householdId],
    queryFn: () => fetchCats(householdId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### 3. API Route Patterns

#### Using withAuth Helper
```typescript
// app/api/cats/route.ts
import { withAuth } from '@/lib/auth';
import { ApiResponse } from '@/lib/responses/api-responses';
import { createCatDtoSchema } from '@/lib/validations/cats';

export const GET = withAuth(async (request, user) => {
  const cats = await CatRepository.getByHousehold(user.householdId!);
  return ApiResponse.success(cats, 200, request);
});

export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const validation = createCatDtoSchema.safeParse(body);
  
  if (!validation.success) {
    return ApiResponse.validationError(validation.error.flatten(), request);
  }
  
  const cat = await CatRepository.create({
    ...validation.data,
    ownerId: user.id,
  });
  
  return ApiResponse.success(cat, 201, request);
});
```

### 4. Database Access Patterns

#### Repository Pattern
```typescript
// lib/repositories/cat-repository.ts
export const CatRepository = {
  async getById(id: string) {
    return prisma.cats.findUnique({
      where: { id },
      include: {
        household: true,
        feeding_logs: { take: 10 },
      },
    });
  },

  async getByHousehold(householdId: string) {
    return prisma.cats.findMany({
      where: { household_id: householdId },
      orderBy: { name: 'asc' },
    });
  },

  async create(data: CreateCatData) {
    return prisma.cats.create({ data });
  },
};
```

### 5. Validation Patterns

#### Using Zod Schemas
```typescript
// lib/validations/cats.ts
export const createCatSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  householdId: z.string().uuid(),
  weight: z.number().positive().max(50).optional(),
});

// lib/dto/cat.dto.ts
export function validateCreateCat(input: unknown) {
  const result = createCatSchema.safeParse(input);
  
  if (!result.success) {
    throw new ValidationError('Invalid input', result.error.flatten());
  }
  
  return result.data;
}
```

## Error Handling

### API Error Response Format
```typescript
// lib/responses/api-responses.ts
export class ApiResponse {
  static error(
    message: string,
    status = 500,
    code?: string,
    details?: unknown,
    request?: NextRequest
  ): NextResponse {
    return NextResponse.json(
      { error: message, code, details },
      { status, headers: { 'Access-Control-Allow-Origin': getCorsOrigin(request) } }
    );
  }

  static validationError(details: unknown, request?: NextRequest): NextResponse {
    return this.error('Validation failed', 400, 'VALIDATION_ERROR', details, request);
  }

  static notFound(message = 'Not found', request?: NextRequest): NextResponse {
    return this.error(message, 404, 'NOT_FOUND', undefined, request);
  }
}
```

### React Error Boundary
```typescript
// components/error-boundary.tsx
export class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('ErrorBoundary caught error', { error, info });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={this.handleReset} />;
    }
    return this.props.children;
  }
}
```

## Security Best Practices

### 1. Authentication
- Always use `withAuth` helper for API routes
- Never trust client-provided IDs
- Use Supabase Session for web, JWT for mobile

### 2. Authorization
- Check household membership before access
- Use RLS policies in database
- Validate user owns resource before modifications

### 3. Input Validation
- Validate all inputs with Zod
- Sanitize strings (trim, escape)
- Limit request sizes

### 4. Rate Limiting
- Use `withRateLimit` for sensitive endpoints
- Configure limits based on endpoint sensitivity

## Performance Optimization

### 1. React Performance
- Memoize expensive computations
- Use `React.memo` for list items
- Implement code splitting with dynamic imports

### 2. Data Fetching
- Use React Query for server state
- Implement proper caching strategies
- Use optimistic updates for mutations

### 3. Database Queries
- Add indexes for frequently queried fields
- Use `select` to limit returned fields
- Implement pagination for large datasets

## Logging & Monitoring

### Using the Logger
```typescript
import { logger } from '@/lib/monitoring/logger';

logger.info('User performed action', { userId, action });
logger.warn('Something needs attention', { context });
logger.error('Operation failed', { error, userId });
```

### Request Tracing
```typescript
logger.logRequest('info', 'API request received', request, { userId });
```

## Testing Guidelines

### Unit Tests
- Test repository functions
- Test validation schemas
- Test utility functions

### E2E Tests (Playwright)
- Test critical user flows
- Test authentication flows
- Test error scenarios

## References
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Zod Documentation](https://zod.dev)
- [React Query Documentation](https://tanstack.com/query/latest)
