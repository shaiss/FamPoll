import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { hasClerk } from "@/lib/env";

const isProtectedRoute = createRouteMatcher(["/app(.*)", "/join(.*)"]);

const withClerk = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

/**
 * Next.js 16 proxy (the file that replaced middleware.ts). When Clerk is not
 * configured yet, every protected route is sent to the setup page instead of
 * crashing, so a fresh deployment stays green.
 */
export default function proxy(req: NextRequest, evt: Parameters<typeof withClerk>[1]) {
  if (!hasClerk) {
    if (isProtectedRoute(req)) {
      return NextResponse.redirect(new URL("/setup", req.url));
    }
    return NextResponse.next();
  }
  return withClerk(req, evt);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
