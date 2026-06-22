"use client";

import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Divider, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { useState } from "react";

interface EnabledBasketballSelection {
  marketKey: string;
  marketUrl: string;
  outcome: string;
  params?: string;
  price: number;
  probability?: number;
  minStake?: number;
  maxStake?: number;
  status: "SELECTION_ENABLED";
}

interface EnabledBasketballMatch {
  id: number;
  name: string;
  status: string;
  cutoffTime?: string;
  competitionName?: string;
  selections: EnabledBasketballSelection[];
}

interface EnabledBasketballMatchesResponse {
  matches: EnabledBasketballMatch[];
  totalMatches: number;
  totalSelections: number;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatOdds(value: number) {
  return value.toFixed(3);
}

export function BasketballEnabledMatchesButton() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<EnabledBasketballMatchesResponse | null>(null);

  async function loadMatches() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/cloudbet/matches/basketball-enabled", { cache: "no-store" });
      const body = (await response.json()) as EnabledBasketballMatchesResponse & { message?: string };

      if (!response.ok) {
        setErrorMessage(body.message ?? "Unable to load enabled basketball matches.");
        return;
      }

      setData(body);
    } catch {
      setErrorMessage("Unable to load enabled basketball matches.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);

    if (!data) {
      void loadMatches();
    }
  }

  return (
    <>
      <Button onClick={handleOpen} variant="outlined">
        Enabled basketball matches
      </Button>
      <Dialog fullWidth maxWidth="md" onClose={() => setOpen(false)} open={open}>
        <DialogTitle>Basketball matches with SELECTION_ENABLED</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ py: 1 }}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
              <Typography color="text.secondary" variant="body2">
                {data ? `${data.totalMatches} matches - ${data.totalSelections} enabled selections` : "Fetches current Cloudbet basketball lines."}
              </Typography>
              <Button disabled={isLoading} onClick={loadMatches} size="small">
                Refresh
              </Button>
            </Stack>

            {isLoading ? (
              <Stack spacing={1} sx={{ alignItems: "center", py: 4 }}>
                <CircularProgress size={28} />
                <Typography color="text.secondary" variant="body2">Loading enabled basketball matches...</Typography>
              </Stack>
            ) : null}

            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

            {!isLoading && data?.matches.length === 0 ? (
              <Alert severity="info">No basketball matches currently have SELECTION_ENABLED selections.</Alert>
            ) : null}

            {data?.matches.map((match) => (
              <Box key={match.id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 2 }}>
                <Stack spacing={1}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between" }}>
                    <Box>
                      <Typography sx={{ fontWeight: 900 }}>{match.name}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {match.competitionName ?? "Unknown competition"} - {formatDateTime(match.cutoffTime)}
                      </Typography>
                    </Box>
                    <Button component={Link} href={`/matches/${match.id}?sport=basketball`} size="small">
                      View
                    </Button>
                  </Stack>
                  <Divider />
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                    {match.selections.slice(0, 12).map((selection) => (
                      <Chip
                        color="success"
                        key={`${selection.marketUrl}-${selection.outcome}`}
                        label={`${selection.marketKey} - ${selection.outcome} @ ${formatOdds(selection.price)}`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                    {match.selections.length > 12 ? <Chip label={`+${match.selections.length - 12} more`} size="small" /> : null}
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
