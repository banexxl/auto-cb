import { Alert, Box, Stack, Typography } from "@mui/material";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MatchesFilters } from "@/components/matches/MatchesFilters";
import { MatchesTable } from "@/components/matches/MatchesTable";
import { getAvailableMatches, getSports } from "@/lib/cloudbet/cloudbet-service";
import type { CloudbetMatch, CloudbetSport } from "@/lib/cloudbet/cloudbet-types";
import { requireUser } from "@/lib/supabase/auth";

interface MatchesPageProps {
  searchParams: Promise<{ sport?: string; limit?: string }>;
}

interface MatchesData {
  matches: CloudbetMatch[];
  errorMessage?: string;
}

const fallbackSports: CloudbetSport[] = [
  { key: "soccer", name: "Soccer" },
  { key: "tennis", name: "Tennis" },
  { key: "basketball", name: "Basketball" },
  { key: "baseball", name: "Baseball" },
];

async function getMatchesData(sport: string, limit: number): Promise<MatchesData> {
  try {
    const matches = await getAvailableMatches({ sport, limit });
    return { matches };
  } catch (error) {
    return {
      matches: [],
      errorMessage: error instanceof Error ? error.message : "Unable to load matches.",
    };
  }
}

async function getSportsData(): Promise<CloudbetSport[]> {
  try {
    const sports = await getSports();
    return sports.length > 0 ? sports : fallbackSports;
  } catch {
    return fallbackSports;
  }
}

function getSafeLimit(value?: string) {
  if (!value) {
    return 100;
  }

  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 && parsedValue <= 10000 ? parsedValue : 100;
}

function getSafeSport(value: string, sports: CloudbetSport[]) {
  return sports.some((sport) => sport.key === value) ? value : "soccer";
}

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  await requireUser("/matches");
  const params = await searchParams;
  const sports = await getSportsData();
  const sport = getSafeSport(params.sport?.trim() || "soccer", sports);
  const limit = getSafeLimit(params.limit);
  const { matches, errorMessage } = await getMatchesData(sport, limit);

  return (
    <DashboardLayout>
      <Stack spacing={3}>
        <Box>
          <Typography component="h1" sx={{ fontWeight: 900 }} variant="h4">
            Matches
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Browse live and upcoming Cloudbet events by sport.
          </Typography>
        </Box>

        <MatchesFilters limit={limit} sport={sport} sports={sports} />

        {errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}
        <MatchesTable errorMessage={errorMessage} matches={matches} />
      </Stack>
    </DashboardLayout>
  );
}
