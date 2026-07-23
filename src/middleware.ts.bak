import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (path.startsWith("/student") && token?.role !== "STUDENT") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (path.startsWith("/parent") && token?.role !== "PARENT") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (path.startsWith("/teacher") && token?.role !== "TEACHER") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/parent/:path*", "/teacher/:path*"],
};
