const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
  pathname: '/',
}));

const usePathname = jest.fn(() => '/');
const useSearchParams = jest.fn(() => new URLSearchParams());
const redirect = jest.fn();
const notFound = jest.fn();

module.exports = {
  useRouter,
  usePathname,
  useSearchParams,
  redirect,
  notFound,
};
