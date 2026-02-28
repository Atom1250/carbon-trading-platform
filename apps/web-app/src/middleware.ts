import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;
const figmaRuntimeEnabled =
  process.env["FIGMA_RUNTIME_ENABLED"] === "true" && process.env["NODE_ENV"] !== "production";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Keep /figma as an explicit preview-only surface.
  if (pathname === "/figma" || pathname.startsWith("/figma/")) {
    if (!figmaRuntimeEnabled) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.delete("figma");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Never rewrite portal routes to /figma. Production UI is portal-first.
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
