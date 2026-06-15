import { Box, CircularProgress, Skeleton, Stack } from "@mui/material";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default function Loading() {
  return (
    <DashboardLayout>
      <Stack spacing={3}>
        <Skeleton height={48} width={240} />
        <Skeleton height={72} variant="rounded" />
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </Stack>
    </DashboardLayout>
  );
}
