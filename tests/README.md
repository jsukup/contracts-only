# Authentication Integration Tests

## Quick Start

### 1. Local Testing

```bash
# First-time setup
cp .env.test.example .env.test.local
# Edit .env.test.local with your test Supabase credentials

# Test your connection
npm run test:supabase

# Run all auth tests
npm run test:auth

# Run with coverage
npm run test:auth:coverage

# Watch mode for development
npm run test:auth:watch
```

### 2. Vercel Deployment Testing

Add these secrets to your Vercel project:

```bash
# In Vercel Dashboard > Settings > Environment Variables
TEST_SUPABASE_URL=your-test-project-url
TEST_SUPABASE_ANON_KEY=your-test-anon-key
TEST_SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key  # Optional
ENABLE_INTEGRATION_TESTS=true
```

## Test Files

| File | Description | Coverage |
|------|-------------|----------|
| `auth-core.integration.test.ts` | Core authentication fixes (406/409 errors, upsert logic) | ✅ |
| `auth-flow.integration.test.ts` | Complete authentication flow testing | ✅ |
| `api-auth.integration.test.ts` | API endpoint authentication (401 fixes) | ✅ |
| `oauth-role-selection.integration.test.ts` | OAuth role selection flow | ✅ |

## Running Tests

### All Authentication Tests
```bash
npm run test:auth
```

### Specific Test Suites
```bash
# Core authentication fixes
npm test tests/integration/auth-core.integration.test.ts

# Complete auth flow
npm test tests/integration/auth-flow.integration.test.ts

# API authentication
npm test tests/integration/api-auth.integration.test.ts

# OAuth role selection
npm test tests/integration/oauth-role-selection.integration.test.ts
```

### With Different Options
```bash
# Verbose output for debugging
npm run test:integration:verbose

# Coverage report
npm run test:auth:coverage

# Watch mode
npm run test:auth:watch

# CI mode (for GitHub Actions)
npm run test:integration:auth -- --ci
```

## Environment Setup

### Test Supabase Project

1. Create a separate Supabase project for testing
2. Run the schema migration:

```sql
-- In your test Supabase SQL editor
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'RECRUITER');

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  role user_role DEFAULT 'USER',
  email_verified TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### Environment Variables

Create `.env.test.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Optional but recommended
```

## CI/CD Integration

### GitHub Actions

The workflow `.github/workflows/auth-tests.yml` automatically runs tests on:
- Push to `main` or `develop` branches
- Pull requests to `main`
- Changes to auth-related files

Required GitHub Secrets:
- `TEST_SUPABASE_URL`
- `TEST_SUPABASE_ANON_KEY`
- `TEST_SUPABASE_SERVICE_ROLE_KEY` (optional)

### Vercel

For Vercel deployments, the build process will:
1. Check for test environment variables
2. Run authentication tests if `ENABLE_INTEGRATION_TESTS=true`
3. Continue or fail deployment based on test results

## Test Coverage

Current coverage targets:
- **Minimum**: 80% coverage for authentication code
- **Goal**: 90%+ coverage for critical auth paths

View coverage report:
```bash
npm run test:auth:coverage
open coverage/lcov-report/index.html
```

## Debugging

### Connection Issues

Test your Supabase connection:
```bash
npm run test:supabase
```

### Test Failures

Run with verbose output:
```bash
npm run test:integration:verbose
```

Enable debug logging:
```bash
DEBUG=* npm run test:auth
```

### Common Issues

1. **Missing Environment Variables**
   - Solution: Check `.env.test.local` exists and contains valid credentials

2. **Database Schema Mismatch**
   - Solution: Run the schema migration in your test Supabase project

3. **Rate Limiting**
   - Solution: Use a dedicated test project, not production

4. **Test Timeouts**
   - Solution: Increase timeout in `jest.config.js` or individual tests

## Test Data Cleanup

Tests automatically clean up after themselves by:
1. Tracking created test users
2. Deleting them in `afterAll` hooks
3. Using email patterns like `test-*@example.com` for easy identification

Manual cleanup if needed:
```sql
-- In Supabase SQL editor
DELETE FROM users WHERE email LIKE 'test-%@example.com';
```

## Best Practices

1. **Always use a separate test Supabase project**
2. **Never run integration tests against production**
3. **Keep test data isolated with unique email patterns**
4. **Run tests before committing auth changes**
5. **Monitor test execution time and optimize slow tests**
6. **Update tests when adding new auth features**

## Troubleshooting

### Tests Pass Locally but Fail in CI

Check:
- Environment variables in CI match local setup
- Supabase project settings are identical
- Network connectivity from CI to Supabase

### Tests are Slow

Options:
- Run tests in parallel: `--maxWorkers=4`
- Use connection pooling
- Reduce test data creation
- Skip non-critical assertions

### Can't Create Test Users

Ensure:
- Service role key is set (for admin operations)
- Email rate limiting is disabled in test project
- Auth settings allow sign-ups

## Support

For issues with:
- **Test setup**: Check `/docs/TESTING_GUIDE.md`
- **Supabase**: Visit https://supabase.com/docs
- **Jest**: See https://jestjs.io/docs

## Contributing

When adding new authentication features:
1. Write integration tests first (TDD)
2. Ensure tests pass locally
3. Update this README if needed
4. Verify CI passes before merging