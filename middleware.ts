import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

const protectedRoutes = ["/", "/dashboard", "/matches", "/ticket"];

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

function isProtectedPath(pathname: string) {
  return protectedRoutes.some((route) => pathname === route || (route !== "/" && pathname.startsWith(`${route}/`)));
}

function redirectToLogin(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";

  if (request.nextUrl.pathname !== "/") {
    redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
  } else {
    redirectUrl.search = "";
  }

  return NextResponse.redirect(redirectUrl);
}

function redirectToDashboard(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/dashboard";
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const protectedPath = isProtectedPath(pathname);
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  if (!supabaseUrl || !supabaseKey) {
    if (protectedPath) {
      return redirectToLogin(request);
    }

    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && protectedPath) {
    return redirectToLogin(request);
  }

  if (user && (pathname === "/" || pathname === "/login")) {
    return redirectToDashboard(request);
  }

  return response;
}

export const config = {
  matcher: ["/", "/dashboard", "/dashboard/:path*", "/matches", "/matches/:path*", "/ticket", "/ticket/:path*", "/login"],
};

