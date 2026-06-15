"use client";

import { Alert, Avatar, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: username,
      password,
    });

    setIsLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace(searchParams.get("redirectedFrom") ?? "/dashboard");
    router.refresh();
  }

  return (
    <Paper elevation={16} sx={{ p: 4, borderRadius: 4 }}>
      <Stack spacing={3} sx={{ alignItems: "center" }}>
        <Avatar sx={{ bgcolor: "primary.main" }}>
          🔐
        </Avatar>
        <Box sx={{ textAlign: "center" }}>
          <Typography component="h1" sx={{ fontWeight: 800 }} variant="h4">
            Sports Dashboard
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Sign in with your Supabase account.
          </Typography>
        </Box>
        {error ? <Alert severity="error" sx={{ width: "100%" }}>{error}</Alert> : null}
        <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
          <Stack spacing={2.5}>
            <TextField
              autoComplete="username"
              autoFocus
              disabled={isLoading}
              fullWidth
              label="Username"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              required
              value={username}
            />
            <TextField
              autoComplete="current-password"
              disabled={isLoading}
              fullWidth
              label="Password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            <Button disabled={isLoading} fullWidth size="large" type="submit" variant="contained">
              {isLoading ? "Signing in..." : "Login"}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
