import { Skeleton, Stack } from "@mui/material";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MatchesTableLoading } from "@/components/matches/MatchesTable";

export default function Loading() {
  return (
    <DashboardLayout>
      <Stack spacing={3}>
        <Skeleton height={48} width={240} />
        <Skeleton height={72} variant="rounded" />
        <MatchesTableLoading />
      </Stack>
    </DashboardLayout>
  );
}
