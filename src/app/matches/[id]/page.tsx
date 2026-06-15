import { Alert, Button, Stack } from "@mui/material";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { requireUser } from "@/lib/supabase/auth";
import { MatchDetails } from "@/components/matches/MatchDetails";
import { getMatchById } from "@/lib/cloudbet/cloudbet-service";
import type { CloudbetMatchDetails } from "@/lib/cloudbet/cloudbet-types";

interface MatchDetailsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sport?: string }>;
}

interface MatchDetailsData {
  match?: CloudbetMatchDetails;
  errorMessage?: string;
}

async function getMatchDetailsData(id: string, sport: string): Promise<MatchDetailsData> {
  try {
    const match = await getMatchById(id, { sport });
    return { match };
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : "Unable to load match details.",
    };
  }
}

export default async function MatchDetailsPage({ params, searchParams }: MatchDetailsPageProps) {
  const { id } = await params;
  await requireUser(`/matches/${id}`);
  const { sport = "soccer" } = await searchParams;
  const { match, errorMessage } = await getMatchDetailsData(id, sport);

  return (
    <DashboardLayout>
      <Stack spacing={3}>
        <Button href={`/matches?sport=${sport}`} sx={{ alignSelf: "flex-start" }}>
          Back to matches
        </Button>
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        {match ? <MatchDetails match={match} /> : null}
      </Stack>
    </DashboardLayout>
  );
}

