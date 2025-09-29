// jest.setup.js
require('@testing-library/jest-dom');
const { TextEncoder, TextDecoder } = require('util');

// Polyfill TextEncoder and TextDecoder for jsdom/jest environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Create a single storage mock to be reused across environments
const storageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Assign the same storageMock to globalThis for both Node and browser environments
globalThis.localStorage = storageMock;

// Ensure window object exists and uses the same storageMock
globalThis.window = globalThis.window || { localStorage: storageMock };

// For Node.js environment, also set global.localStorage for compatibility
if (typeof global !== 'undefined') {
  global.localStorage = storageMock;
}


