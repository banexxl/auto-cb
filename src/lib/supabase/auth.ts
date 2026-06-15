import { redirect } from "next/navigation";
import { createClient } from "./server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireUser(redirectedFrom?: string) {
  const user = await getCurrentUser();

  if (!user) {
    const loginPath = redirectedFrom
      ? `/login?redirectedFrom=${encodeURIComponent(redirectedFrom)}`
      : "/login";
    redirect(loginPath);
  }

  return user;
}

export async function redirectAuthenticatedUser() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }
}
