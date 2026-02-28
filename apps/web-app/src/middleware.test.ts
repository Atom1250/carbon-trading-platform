const nextMock = jest.fn(() => ({ kind: "next" }));
const redirectMock = jest.fn((url: URL) => ({ kind: "redirect", url: url.toString() }));

jest.mock("next/server", () => ({
  NextResponse: {
    next: nextMock,
    redirect: redirectMock,
  },
}));

describe("middleware", () => {
  function makeRequest(url: string) {
    const nextUrl = new URL(url) as URL & { clone: () => URL };
    nextUrl.clone = () => new URL(nextUrl.toString());

    return { nextUrl } as any;
  }

  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = "test";
    nextMock.mockClear();
    redirectMock.mockClear();
  });

  it("does not rewrite normal portal routes", async () => {
    process.env.FIGMA_RUNTIME_ENABLED = "false";
    const { middleware } = await import("./middleware");

    const response = middleware(makeRequest("https://example.com/trading"));

    expect(nextMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).not.toHaveBeenCalled();
    expect(response).toEqual({ kind: "next" });
  });

  it("redirects /figma routes when runtime is disabled", async () => {
    process.env.FIGMA_RUNTIME_ENABLED = "false";
    const { middleware } = await import("./middleware");

    const response = middleware(makeRequest("https://example.com/figma/trading"));

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(nextMock).not.toHaveBeenCalled();
    expect(response).toEqual({ kind: "redirect", url: "https://example.com/dashboard" });
  });

  it("allows /figma routes when runtime is enabled", async () => {
    process.env.NODE_ENV = "development";
    process.env.FIGMA_RUNTIME_ENABLED = "true";
    const { middleware } = await import("./middleware");

    const response = middleware(makeRequest("https://example.com/figma/trading"));

    expect(nextMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).not.toHaveBeenCalled();
    expect(response).toEqual({ kind: "next" });
  });

  it("blocks /figma routes in production even when flag is enabled", async () => {
    process.env.NODE_ENV = "production";
    process.env.FIGMA_RUNTIME_ENABLED = "true";
    const { middleware } = await import("./middleware");

    const response = middleware(makeRequest("https://example.com/figma/trading"));

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(nextMock).not.toHaveBeenCalled();
    expect(response).toEqual({ kind: "redirect", url: "https://example.com/dashboard" });
  });
});
