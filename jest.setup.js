// jest.setup.js
require('@testing-library/jest-dom');
const { TextEncoder, TextDecoder } = require('util');

// Polyfill TextEncoder and TextDecoder for jsdom/jest environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Create a single storage mock with in-memory backing store
const storageMock = (() => {
  // In-memory backing store
  const store = {};
  
  return {
    getItem: (key) => {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
  };
})();

// Assign the same storageMock to globalThis for both Node and browser environments
globalThis.localStorage = storageMock;

// Ensure window object exists and uses the same storageMock
globalThis.window = globalThis.window || { localStorage: storageMock };

// For Node.js environment, also set global.localStorage for compatibility
if (typeof global !== 'undefined') {
  global.localStorage = storageMock;
}