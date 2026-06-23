import { Alert, Box, Stack, Typography } from "@mui/material";
import { Suspense } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BasketballEnabledMatchesButton } from "@/components/matches/BasketballEnabledMatchesButton";
import { SoccerEnabledMatchesButton } from "@/components/matches/SoccerEnabledMatchesButton";
import { MatchesFilters } from "@/components/matches/MatchesFilters";
import { MatchesTable, MatchesTableLoading } from "@/components/matches/MatchesTable";
import { getAvailableMatches, getSports } from "@/lib/cloudbet/cloudbet-service";
import type { CloudbetMatch, CloudbetSport } from "@/lib/cloudbet/cloudbet-types";
import { requireUser } from "@/lib/supabase/auth";

interface MatchesPageProps {
  searchParams: Promise<{ competitionName?: string; sport?: string; limit?: string }>;
}

interface MatchesData {
  matches: CloudbetMatch[];
  errorMessage?: string;
}

interface MatchesResultsProps {
  competitionName: string;
  limit: number;
  sport: string;
  sports: CloudbetSport[];
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

function getCompetitionNames(matches: CloudbetMatch[]) {
  return Array.from(
    new Set(
      matches
        .map((match) => match.competition?.name?.trim())
        .filter((competitionName): competitionName is string => Boolean(competitionName)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function filterMatchesByCompetition(matches: CloudbetMatch[], competitionName: string) {
  if (!competitionName) {
    return matches;
  }

  return matches.filter((match) => match.competition?.name?.trim() === competitionName);
}

async function MatchesResults({ competitionName, limit, sport, sports }: MatchesResultsProps) {
  const { matches, errorMessage } = await getMatchesData(sport, limit);
  const competitionNames = getCompetitionNames(matches);
  const safeCompetitionName = competitionNames.includes(competitionName) ? competitionName : "";
  const filteredMatches = filterMatchesByCompetition(matches, safeCompetitionName);

  return (
    <>
      <MatchesFilters
        competitionName={safeCompetitionName}
        competitionNames={competitionNames}
        limit={limit}
        sport={sport}
        sports={sports}
      />

      {errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}
      <MatchesTable errorMessage={errorMessage} matches={filteredMatches} />
    </>
  );
}

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  await requireUser("/matches");
  const params = await searchParams;
  const sports = await getSportsData();
  const sport = getSafeSport(params.sport?.trim() || "soccer", sports);
  const limit = getSafeLimit(params.limit);
  const competitionName = params.competitionName?.trim() ?? "";

  return (
    <DashboardLayout>
      <Stack spacing={3}>
        <Box sx={{ alignItems: { sm: "center" }, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, justifyContent: "space-between" }}>
          <Box>
            <Typography component="h1" sx={{ fontWeight: 900 }} variant="h4">
              Matches
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Browse live and upcoming Cloudbet events by sport.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <SoccerEnabledMatchesButton />
            <BasketballEnabledMatchesButton />
          </Stack>
        </Box>

        <Suspense fallback={<MatchesTableLoading />} key={`${sport}-${limit}-${competitionName}`}>
          <MatchesResults competitionName={competitionName} limit={limit} sport={sport} sports={sports} />
        </Suspense>
      </Stack>
    </DashboardLayout>
  );
}
