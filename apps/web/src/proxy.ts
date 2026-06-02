import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/dashboard"];
const publicRoutes = ["/login"];

export default async function middleware(req: NextRequest) {
  if (req.headers.get("x-middleware-subrequest")) {
    return new NextResponse(null, { status: 403 });
  }

  const path = req.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some(
    (route) => path === route || path.startsWith(route + "/"),
  );
  const isPublicRoute = publicRoutes.some(
    (route) => path === route || path.startsWith(route + "/"),
  );

  const accessToken = req.cookies.get("accessToken")?.value;
  const refreshToken = req.cookies.get("refreshToken")?.value;

  if (path === "/") {
    if (accessToken || refreshToken) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    } else {
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }
  }

  if (isProtectedRoute && !accessToken && !refreshToken) {
    const loginUrl = new URL("/login", req.nextUrl);

    const rawReturnUrl = req.nextUrl.pathname + req.nextUrl.search;
    const isSafeRelative =
      rawReturnUrl.startsWith("/") && !rawReturnUrl.startsWith("//");
    if (isSafeRelative) {
      loginUrl.searchParams.set("return-url", rawReturnUrl);
    }

    return NextResponse.redirect(loginUrl);
  }

  if (isPublicRoute && (accessToken || refreshToken)) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
