#!/bin/bash

# Vercel Deployment Test Script
# This script runs during Vercel build to test authentication

echo "🔐 Running Authentication Tests for Vercel Deployment"
echo "====================================================="

# Check if we should run tests
if [ "$ENABLE_INTEGRATION_TESTS" != "true" ]; then
  echo "ℹ️  Integration tests disabled (ENABLE_INTEGRATION_TESTS != true)"
  echo "   To enable, set ENABLE_INTEGRATION_TESTS=true in Vercel environment"
  exit 0
fi

# Check for test environment variables
if [ -z "$TEST_SUPABASE_URL" ] || [ -z "$TEST_SUPABASE_ANON_KEY" ]; then
  echo "⚠️  Test environment variables not configured"
  echo "   Required: TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY"
  echo "   Skipping integration tests..."
  exit 0
fi

# Map test environment variables to standard ones
export NEXT_PUBLIC_SUPABASE_URL=$TEST_SUPABASE_URL
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$TEST_SUPABASE_ANON_KEY

if [ ! -z "$TEST_SUPABASE_SERVICE_ROLE_KEY" ]; then
  export SUPABASE_SERVICE_ROLE_KEY=$TEST_SUPABASE_SERVICE_ROLE_KEY
fi

# Install test dependencies if needed
if ! command -v jest &> /dev/null; then
  echo "📦 Installing test dependencies..."
  npm install --save-dev jest @testing-library/react @testing-library/jest-dom
fi

# Run tests
echo "🧪 Running authentication integration tests..."
npm run test:integration:auth -- --ci --silent --maxWorkers=2

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ All authentication tests passed!"
else
  echo "❌ Authentication tests failed with exit code $TEST_EXIT_CODE"
  
  # In preview deployments, we might want to continue despite test failures
  if [ "$VERCEL_ENV" == "preview" ] && [ "$ALLOW_TEST_FAILURES" == "true" ]; then
    echo "⚠️  Continuing deployment despite test failures (preview mode)"
    exit 0
  fi
  
  exit $TEST_EXIT_CODE
fi