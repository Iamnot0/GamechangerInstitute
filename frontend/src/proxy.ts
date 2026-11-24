import { NextResponse, type NextRequest } from "next/server";

const PROD_COOKIE = "__Host-gci_staff";
const DEV_COOKIE = "gci_staff";

export default function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const token = request.cookies.get(PROD_COOKIE)?.value ?? request.cookies.get(DEV_COOKIE)?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/sign-in/", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/sign-in/:path*"],
};
