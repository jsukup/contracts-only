import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock AuthContext (Supabase)
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'USER',
    },
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
  }),
  AuthProvider: ({ children }) => children,
}))

// Mock Supabase client - note: specific tests can override this mock
const mockSupabaseQuery = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  like: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  contains: jest.fn().mockReturnThis(),
  containedBy: jest.fn().mockReturnThis(),
  rangeGt: jest.fn().mockReturnThis(),
  rangeGte: jest.fn().mockReturnThis(),
  rangeLt: jest.fn().mockReturnThis(),
  rangeLte: jest.fn().mockReturnThis(),
  rangeAdjacent: jest.fn().mockReturnThis(),
  overlaps: jest.fn().mockReturnThis(),
  strictlyLeft: jest.fn().mockReturnThis(),
  strictlyRight: jest.fn().mockReturnThis(),
  notExtendRight: jest.fn().mockReturnThis(),
  notExtendLeft: jest.fn().mockReturnThis(),
  adjacent: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  filter: jest.fn().mockReturnThis(),
  match: jest.fn().mockReturnThis(),
  textSearch: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  count: jest.fn().mockResolvedValue({ count: 0, error: null }),
  then: jest.fn().mockResolvedValue({ data: [], error: null }),
}

const mockSupabase = {
  from: jest.fn(() => mockSupabaseQuery),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: null, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: null, error: null }),
      download: jest.fn().mockResolvedValue({ data: null, error: null }),
      remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: '' } }),
    })),
  },
}

// Global mock for Supabase
global.__mockSupabase = mockSupabase

// Mock @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

// Mock our auth lib
jest.mock('@/lib/auth', () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com', 
      role: 'USER',
    },
  }),
  authOptions: {},
}))

// Mock our Supabase client file
jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  createServerSupabaseClient: jest.fn(() => mockSupabase),
  createServiceSupabaseClient: jest.fn(() => mockSupabase),
  getCurrentUser: jest.fn().mockResolvedValue({
    id: 'test-user-id',
    name: 'Test User', 
    email: 'test@example.com',
    role: 'USER',
  }),
  signOut: jest.fn().mockResolvedValue(undefined),
  signInWithGoogle: jest.fn().mockResolvedValue({ data: null, error: null }),
  createOrUpdateUser: jest.fn().mockResolvedValue({ 
    data: { id: 'test-user-id', email: 'test@example.com' }, 
    isNewUser: false 
  }),
}))

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock Request and Response for Next.js API routes
global.Request = jest.fn().mockImplementation((url, options = {}) => ({
  url,
  method: options.method || 'GET',
  headers: new Map(Object.entries(options.headers || {})),
  body: options.body,
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
  formData: jest.fn().mockResolvedValue(new FormData()),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  blob: jest.fn().mockResolvedValue(new Blob())
}))

// Mock NextResponse for API routes
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, options = {}) => ({
      json: jest.fn().mockResolvedValue(data),
      status: options.status || 200,
      ok: (options.status || 200) >= 200 && (options.status || 200) < 300,
      headers: new Map(Object.entries(options.headers || {}))
    }))
  }
}))

global.Response = jest.fn().mockImplementation((body, options = {}) => ({
  ok: (options.status || 200) >= 200 && (options.status || 200) < 300,
  status: options.status || 200,
  statusText: options.statusText || 'OK',
  headers: new Map(Object.entries(options.headers || {})),
  body,
  json: jest.fn().mockResolvedValue(body ? JSON.parse(body) : {}),
  text: jest.fn().mockResolvedValue(body || ''),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  blob: jest.fn().mockResolvedValue(new Blob([body || '']))
}))

// Add static methods to Response
global.Response.json = jest.fn((data, options = {}) => ({
  json: jest.fn().mockResolvedValue(data),
  status: options.status || 200,
  ok: (options.status || 200) >= 200 && (options.status || 200) < 300,
  headers: new Map(Object.entries(options.headers || {}))
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock window.ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver for lazy loading
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Suppress console warnings in tests
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeAll(() => {
  console.warn = (...args) => {
    if (args[0]?.includes('Warning: ReactDOM.render is no longer supported')) {
      return
    }
    originalConsoleWarn.apply(console, args)
  }
  
  console.error = (...args) => {
    if (args[0]?.includes('Warning:') || args[0]?.includes('Error:')) {
      return
    }
    originalConsoleError.apply(console, args)
  }
})

afterAll(() => {
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
})

// Import custom matchers
require('./tests/setup/custom-matchers')