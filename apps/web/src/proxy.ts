import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const protectedRoutes = ["/dashboard"];

export default async function middleware(req: NextRequest) {
  if (req.headers.get("x-middleware-subrequest")) {
    return new NextResponse(null, { status: 403 });
  }

  const path = req.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some(
    (route) => path === route || path.startsWith(route + "/"),
  );

  // Only whether a Better Auth session cookie is there, not whether its
  // session is still good: the API checks that on every call, and the
  // dashboard sends anyone it turns away to the login page.
  const hasSession = !!getSessionCookie(req, { cookiePrefix: "otbl" });

  if (path === "/") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    } else {
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }
  }

  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL("/login", req.nextUrl);

    const rawReturnUrl = req.nextUrl.pathname + req.nextUrl.search;
    const isSafeRelative =
      rawReturnUrl.startsWith("/") && !rawReturnUrl.startsWith("//");
    if (isSafeRelative) {
      loginUrl.searchParams.set("return-url", rawReturnUrl);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
