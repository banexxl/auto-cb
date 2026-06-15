"use client";

import { AppBar, Box, Button, IconButton, Toolbar, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <AppBar color="inherit" elevation={0} position="sticky" sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
      <Toolbar>
        <IconButton aria-label="Open navigation" edge="start" onClick={onMenuClick} sx={{ display: { md: "none" }, mr: 1 }}>
          ☰
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ fontWeight: 800 }} variant="h6">
            Cloudbet Sports
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Live and upcoming match intelligence
          </Typography>
        </Box>
        <Button color="inherit" onClick={handleLogout}>
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
}
