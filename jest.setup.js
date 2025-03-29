// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock do fetch global
global.fetch = jest.fn();

// Mock do localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn()
};
global.localStorage = localStorageMock;

// Mock do next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }
  },
  usePathname() {
    return ''
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock do next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock do prisma
jest.mock('@/lib/prisma', () => ({
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
}))

// Limpar todos os mocks após cada teste
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
}); 