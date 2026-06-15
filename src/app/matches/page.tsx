import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { requireUser } from "@/lib/supabase/auth";
import { MatchesTable } from "@/components/matches/MatchesTable";
import { getAvailableMatches } from "@/lib/cloudbet/cloudbet-service";
import type { CloudbetMatch } from "@/lib/cloudbet/cloudbet-types";

interface MatchesPageProps {
  searchParams: Promise<{ sport?: string; limit?: string }>;
}

interface MatchesData {
  matches: CloudbetMatch[];
  errorMessage?: string;
}

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

function getSafeLimit(value?: string) {
  if (!value) {
    return 100;
  }

  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 && parsedValue <= 10000 ? parsedValue : 100;
}

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  await requireUser("/matches");
  const params = await searchParams;
  const sport = params.sport?.trim() || "soccer";
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
            Browse live and upcoming Cloudbet events. Use the sport key from Cloudbet, such as soccer, tennis, or basketball.
          </Typography>
        </Box>

        <Box
          component="form"
          sx={{
            alignItems: "center",
            bgcolor: "common.white",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 4,
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            p: 2,
          }}
        >
          <TextField defaultValue={sport} label="Sport key" name="sport" size="small" />
          <TextField defaultValue={limit} slotProps={{ htmlInput: { min: 1, max: 10000 } }} label="Limit" name="limit" size="small" type="number" />
          <Button type="submit" variant="contained">Refresh</Button>
        </Box>

        {errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}
        <MatchesTable errorMessage={errorMessage} matches={matches} />
      </Stack>
    </DashboardLayout>
  );
}


