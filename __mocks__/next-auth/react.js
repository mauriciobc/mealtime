// __mocks__/next-auth/react.js
const react = jest.requireActual('react');
module.exports = {
  SessionProvider: ({ children }) => react.createElement(react.Fragment, null, children),
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })), // Default mock
  signIn: jest.fn(),
  signOut: jest.fn(),
  // Add other exports from next-auth/react you might use and need to mock
}; 