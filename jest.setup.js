// jest.setup.js
require('@testing-library/jest-dom');
const { TextEncoder, TextDecoder } = require('util');

// Polyfill TextEncoder and TextDecoder for jsdom/jest environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock localStorage only if window is available
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });
}

// Mock window for Node.js environment
if (typeof window === 'undefined') {
  global.window = {
    localStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
  };
}

