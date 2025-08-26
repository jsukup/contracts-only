# Authentication Integration Tests - Running Guide

## Overview
This guide explains how to run the authentication integration tests in both local and production environments.

## Test Files
- `tests/integration/auth-core.integration.test.ts` - Core authentication fixes
- `tests/integration/auth-flow.integration.test.ts` - Complete auth flow testing
- `tests/integration/api-auth.integration.test.ts` - API authentication testing
- `tests/integration/oauth-role-selection.integration.test.ts` - OAuth role selection

## 🏠 Local Environment Setup

### 1. Environment Variables
Create a `.env.test.local` file with your Supabase test project credentials:

```env
# Supabase Test Project (use a separate project for testing)
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-test-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key

# Optional: Test-specific settings
NODE_ENV=test
TEST_TIMEOUT=30000
```

### 2. Database Setup for Tests
Ensure your test Supabase project has the same schema as production:

```sql
-- Run this in your test Supabase SQL editor
-- This should match your production schema

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

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Add RLS policies (adjust based on your needs)
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### 3. Running Tests Locally

```bash
# Install dependencies
npm install

# Run all integration tests
npm run test:integration

# Run specific test files
npm test tests/integration/auth-core.integration.test.ts
npm test tests/integration/auth-flow.integration.test.ts
npm test tests/integration/api-auth.integration.test.ts
npm test tests/integration/oauth-role-selection.integration.test.ts

# Run with coverage
npm run test:coverage -- tests/integration/

# Run in watch mode for development
npm run test:watch -- tests/integration/

# Run with verbose output for debugging
npm test -- --verbose tests/integration/auth-core.integration.test.ts
```

### 4. Local Test Database Isolation

To avoid affecting your development data, use a separate Supabase project for testing:

```bash
# Set test environment before running tests
export NODE_ENV=test
export SUPABASE_URL=$TEST_SUPABASE_URL
export SUPABASE_ANON_KEY=$TEST_SUPABASE_ANON_KEY

# Run tests with test database
npm run test:integration
```

## ☁️ Vercel Deployment Testing

### 1. GitHub Actions CI/CD Setup

Create `.github/workflows/test.yml`:

```yaml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run Integration Tests
      env:
        NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
        SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_ROLE_KEY }}
      run: |
        npm run test:integration -- --ci --coverage --maxWorkers=2
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: integration
        name: codecov-integration
```

### 2. Vercel Environment Variables

Add test environment variables in Vercel Dashboard:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add these variables for the "Preview" environment:

```
TEST_SUPABASE_URL=https://your-test-project.supabase.co
TEST_SUPABASE_ANON_KEY=your-test-anon-key
TEST_SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key
ENABLE_INTEGRATION_TESTS=true
```

### 3. Vercel Build & Test Configuration

Create `vercel.json` in your project root:

```json
{
  "buildCommand": "npm run build && npm run test:integration:ci",
  "framework": "nextjs",
  "env": {
    "ENABLE_TESTS": "true"
  },
  "github": {
    "enabled": true,
    "autoAlias": true
  }
}
```

### 4. Preview Deployment Testing

Add a test script for preview deployments in `package.json`:

```json
{
  "scripts": {
    "test:integration:ci": "if [ \"$ENABLE_INTEGRATION_TESTS\" = \"true\" ]; then jest tests/integration --ci --silent; else echo 'Skipping integration tests'; fi",
    "test:deploy": "npm run build && npm run test:integration:ci"
  }
}
```

## 🔧 Test Configuration

### Jest Configuration for Integration Tests

Update `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/tests/integration/**/*.test.ts',
    '**/tests/integration/**/*.test.tsx'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
    }],
  },
  testTimeout: 30000, // 30 seconds for integration tests
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
  ],
};
```

### Test Data Cleanup

Create `tests/setup/cleanup.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function cleanupTestData() {
  if (!serviceRoleKey) {
    console.warn('No service role key - skipping cleanup')
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Clean up test users (email pattern: test-*@example.com)
  const { error } = await supabase
    .from('users')
    .delete()
    .like('email', 'test-%@example.com')

  if (error) {
    console.error('Cleanup error:', error)
  } else {
    console.log('Test data cleaned up successfully')
  }
}

// Run cleanup after all tests
if (process.env.NODE_ENV === 'test') {
  afterAll(async () => {
    await cleanupTestData()
  })
}
```

## 🚀 Running Tests in Different Scenarios

### Development Testing
```bash
# Quick test during development
npm test tests/integration/auth-core.integration.test.ts -- --watch

# Test with real Supabase (slower but more accurate)
NEXT_PUBLIC_SUPABASE_URL=your-url NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key npm run test:integration
```

### Pre-commit Testing
Add to `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run integration tests before commit
npm run test:integration -- --bail
```

### Continuous Integration
```bash
# In CI/CD pipeline
npm run test:integration:ci

# With coverage reporting
npm run test:integration -- --coverage --coverageReporters=text-lcov | coveralls
```

### Production Verification
```bash
# Test against production-like environment
NODE_ENV=production npm run test:integration -- --bail --silent
```

## 📊 Monitoring Test Results

### Local Test Reports
```bash
# Generate HTML coverage report
npm run test:coverage -- tests/integration/
open coverage/lcov-report/index.html

# Generate test results in JSON
npm test -- --json --outputFile=test-results.json tests/integration/
```

### Vercel Deployment Checks

1. **Build Logs**: Check Vercel build logs for test results
2. **Function Logs**: Monitor Vercel Functions logs for API test failures
3. **GitHub Checks**: Review GitHub Actions test results in PR

## 🐛 Debugging Test Failures

### Common Issues and Solutions

1. **Environment Variables Not Found**
   ```bash
   # Check if variables are loaded
   node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
   
   # Use dotenv for local testing
   npm install -D dotenv
   ```

2. **Database Connection Errors**
   ```bash
   # Test Supabase connection
   npx tsx scripts/test-supabase-connection.ts
   ```

3. **Test Timeouts**
   ```javascript
   // Increase timeout for slow operations
   jest.setTimeout(60000); // 60 seconds
   
   // Or per test
   test('slow test', async () => {
     // test code
   }, 60000);
   ```

4. **Race Conditions**
   ```javascript
   // Add proper waits
   await waitFor(() => {
     expect(element).toBeInTheDocument()
   }, { timeout: 5000 })
   ```

### Debug Mode
```bash
# Run with debug output
DEBUG=* npm test tests/integration/auth-core.integration.test.ts

# Run single test with console logs
npm test -- --verbose --no-coverage tests/integration/auth-core.integration.test.ts
```

## 📋 Test Checklist

Before deploying to production, ensure:

- [ ] All integration tests pass locally
- [ ] Tests run successfully in CI/CD pipeline
- [ ] No test data remains in production database
- [ ] Coverage meets minimum threshold (80%)
- [ ] No console errors in test output
- [ ] All async operations properly awaited
- [ ] Test cleanup runs successfully

## 🔐 Security Considerations

1. **Never use production credentials in tests**
2. **Use separate Supabase project for testing**
3. **Rotate test credentials regularly**
4. **Don't commit `.env.test.local` files**
5. **Use GitHub Secrets for CI/CD variables**
6. **Limit test service role permissions**

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)