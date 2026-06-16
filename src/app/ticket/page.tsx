import { Box, Stack, Typography } from "@mui/material";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { TicketClient } from "@/components/ticket/TicketClient";
import { requireUser } from "@/lib/supabase/auth";

export default async function TicketPage() {
  await requireUser("/ticket");

  return (
    <DashboardLayout>
      <Stack spacing={3}>
        <Box>
          <Typography component="h1" sx={{ fontWeight: 900 }} variant="h4">
            Ticket
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Review selections stored locally, calculate total quota, and place Cloudbet Trading API bets.
          </Typography>
        </Box>
        <TicketClient />
      </Stack>
    </DashboardLayout>
  );
}
