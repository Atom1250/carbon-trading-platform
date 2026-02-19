const cookies = jest.fn(() => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  has: jest.fn(),
}));

const headers = jest.fn(() => new Map());

module.exports = { cookies, headers };
