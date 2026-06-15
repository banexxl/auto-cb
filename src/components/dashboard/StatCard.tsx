import { Card, CardContent, Stack, Typography } from "@mui/material";
import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone?: "primary" | "success" | "warning" | "info";
}

const toneColors = {
  primary: "primary.main",
  success: "success.main",
  warning: "warning.main",
  info: "info.main",
};

export function StatCard({ label, value, icon, tone = "primary" }: StatCardProps) {
  return (
    <Card sx={{ borderRadius: 4, height: "100%" }}>
      <CardContent>
        <Stack spacing={2} sx={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
          <Stack spacing={1}>
            <Typography color="text.secondary" variant="body2">
              {label}
            </Typography>
            <Typography sx={{ fontWeight: 900 }} variant="h4">
              {value}
            </Typography>
          </Stack>
          <Stack
            sx={{
              alignItems: "center",
              bgcolor: toneColors[tone],
              borderRadius: 3,
              color: "common.white",
              height: 52,
              justifyContent: "center",
              width: 52,
            }}
          >
            {icon}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
