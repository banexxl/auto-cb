import { Alert, Box, Button, Grid, Stack, Typography } from "@mui/material";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { requireUser } from "@/lib/supabase/auth";
import { StatCard } from "@/components/dashboard/StatCard";
import { MatchesTable } from "@/components/matches/MatchesTable";
import { getAvailableMatches, summarizeMatches } from "@/lib/cloudbet/cloudbet-service";
import type { CloudbetMatch, MatchesSummary } from "@/lib/cloudbet/cloudbet-types";

interface DashboardData {
  matches: CloudbetMatch[];
  summary: MatchesSummary;
  errorMessage?: string;
}

async function getDashboardData(): Promise<DashboardData> {
  try {
    const matches = await getAvailableMatches({ sport: "soccer", limit: 50 });
    return { matches: matches.slice(0, 8), summary: summarizeMatches(matches) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load dashboard data.";
    return {
      matches: [],
      summary: { totalMatches: 0, liveMatches: 0, upcomingMatches: 0, marketsCount: 0 },
      errorMessage: message,
    };
  }
}

export default async function DashboardPage() {
  await requireUser("/dashboard");
  const { matches, summary, errorMessage } = await getDashboardData();

  return (
    <DashboardLayout>
      <Stack spacing={4}>
        <Box>
          <Typography component="h1" sx={{ fontWeight: 900 }} variant="h4">
            Dashboard
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Monitor Cloudbet live and upcoming soccer events from one admin-style workspace.
          </Typography>
        </Box>

        {errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard icon="⚽" label="Total matches" value={summary.totalMatches} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard icon="●" label="Live now" tone="success" value={summary.liveMatches} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard icon="◷" label="Upcoming" tone="warning" value={summary.upcomingMatches} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard icon="↗" label="Markets" tone="info" value={summary.marketsCount} />
          </Grid>
        </Grid>

        <Stack spacing={2} sx={{ flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between" }}>
          <Box>
            <Typography sx={{ fontWeight: 900 }} variant="h5">
              Featured matches
            </Typography>
            <Typography color="text.secondary">First eight events from the current soccer feed.</Typography>
          </Box>
          <Button href="/matches" variant="contained">
            View all matches
          </Button>
        </Stack>

        <MatchesTable errorMessage={errorMessage} matches={matches} />
      </Stack>
    </DashboardLayout>
  );
}


