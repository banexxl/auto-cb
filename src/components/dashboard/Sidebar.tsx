"use client";

import { Box, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export const drawerWidth = 280;

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const navigationItems: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/matches", label: "Matches", icon: "⚽" },
];

function DrawerContent() {
  const pathname = usePathname();

  return (
    <Box sx={{ height: "100%", bgcolor: "#0f172a", color: "common.white" }}>
      <Toolbar sx={{ px: 3 }}>
        <Box>
          <Typography sx={{ fontWeight: 900 }} variant="h6">
            Auto CB
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.64)" }} variant="body2">
            Sports Ops Center
          </Typography>
        </Box>
      </Toolbar>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
      <List sx={{ p: 2 }}>
        {navigationItems.map((item) => {
          const selected = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <ListItemButton
              component={Link}
              href={item.href}
              key={item.href}
              selected={selected}
              sx={{
                borderRadius: 2,
                mb: 1,
                color: "common.white",
                "&.Mui-selected": {
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                },
                "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
              }}
            >
              <ListItemIcon sx={{ color: "inherit", fontSize: 22, minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  return (
    <Box component="nav" sx={{ flexShrink: { md: 0 }, width: { md: drawerWidth } }}>
      <Drawer
        ModalProps={{ keepMounted: true }}
        onClose={onClose}
        open={mobileOpen}
        sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth } }}
        variant="temporary"
      >
        <DrawerContent />
      </Drawer>
      <Drawer
        open
        sx={{ display: { xs: "none", md: "block" }, "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth } }}
        variant="permanent"
      >
        <DrawerContent />
      </Drawer>
    </Box>
  );
}
