// __mocks__/next-auth/jwt.js
module.exports = {
  getToken: jest.fn().mockResolvedValue(null), // Default mock for unauthenticated
  // Add other exports from next-auth/jwt you might use and need to mock
}; 