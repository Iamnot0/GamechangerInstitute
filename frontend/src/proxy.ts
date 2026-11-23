import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isStaffRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isStaffRoute(request)) await auth.protect();
});

// Clerk runs only on the staff console and its sign-in page; the public site never loads it.
export const config = {
  matcher: ["/admin/:path*", "/sign-in/:path*"],
};
