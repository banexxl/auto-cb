import { Box, CircularProgress, Grid, Skeleton, Stack } from "@mui/material";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default function Loading() {
  return (
    <DashboardLayout>
      <Stack spacing={4}>
        <Skeleton height={48} width={280} />
        <Grid container spacing={3}>
          {[0, 1, 2, 3].map((item) => (
            <Grid key={item} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Skeleton height={128} variant="rounded" />
            </Grid>
          ))}
        </Grid>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </Stack>
    </DashboardLayout>
  );
}
