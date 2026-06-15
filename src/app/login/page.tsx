import { Box, Container } from "@mui/material";
import { Suspense } from "react";
import { redirectAuthenticatedUser } from "@/lib/supabase/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  await redirectAuthenticatedUser();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "radial-gradient(circle at top left, #dbeafe 0, transparent 35%), linear-gradient(135deg, #0f172a 0%, #172554 100%)",
        px: 2,
      }}
    >
      <Container maxWidth="xs">
        <Suspense>
          <LoginForm />
        </Suspense>
      </Container>
    </Box>
  );
}
