export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getSupabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function getSupabaseConfig() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabasePublicKey();

  return {
    isConfigured: Boolean(supabaseUrl && supabaseKey),
    supabaseKey,
    supabaseUrl,
  };
}

export function requireSupabaseConfig() {
  const config = getSupabaseConfig();

  if (!config.supabaseUrl || !config.supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return {
    supabaseKey: config.supabaseKey,
    supabaseUrl: config.supabaseUrl,
  };
}
