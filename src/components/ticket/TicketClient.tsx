"use client";

import { Alert, Box, Button, Card, CardContent, Chip, Divider, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useEffect, useMemo, useState } from "react";
import type { PlaceTicketBetApiResponse, PlaceTicketBetRequest, TicketSelection } from "@/lib/ticket-types";
import { formatCloudbetOutcome, formatCloudbetParam } from "@/utils/cloudbet-formatters";
import { calculateTicketSummary } from "@/utils/ticket";
import { clearTicketSelections, readTicketSelections, removeTicketSelection } from "@/utils/ticket-client";

interface BetResult {
  id: string;
  message: string;
  placed: boolean;
  severity: "success" | "warning" | "error";
}

interface CronTestResult {
  message: string;
  severity: "success" | "warning" | "error";
}

const currencyOptions = [
  { label: "EUR", value: "EUR" },
  { label: "USD", value: "USD" },
  { label: "Bitcoin", value: "BTC" },
  { label: "Ethereum", value: "ETH" },
  { label: "Tether", value: "USDT" },
];

function formatOdds(value: number) {
  return value.toFixed(3);
}

function createReferenceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function TicketClient() {
  const [selections, setSelections] = useState<TicketSelection[]>([]);
  const [stake, setStake] = useState("1.00");
  const [currency, setCurrency] = useState("EUR");
  const [cronSecret, setCronSecret] = useState("");
  const [isPlacing, setIsPlacing] = useState(false);
  const [isTestingAnalysis, setIsTestingAnalysis] = useState(false);
  const [results, setResults] = useState<BetResult[]>([]);
  const [cronTestResult, setCronTestResult] = useState<CronTestResult | null>(null);
  const summary = useMemo(() => calculateTicketSummary(selections), [selections]);

  function refreshTicket() {
    setSelections(readTicketSelections());
  }

  useEffect(() => {
    refreshTicket();
    window.addEventListener("storage", refreshTicket);
    window.addEventListener("auto-cb-ticket-updated", refreshTicket);

    return () => {
      window.removeEventListener("storage", refreshTicket);
      window.removeEventListener("auto-cb-ticket-updated", refreshTicket);
    };
  }, []);

  function handleRemove(selectionId: string) {
    removeTicketSelection(selectionId);
    refreshTicket();
  }

  function handleClear() {
    clearTicketSelections();
    refreshTicket();
    setResults([]);
  }

  function handleCurrencyChange(event: SelectChangeEvent<string>) {
    setCurrency(event.target.value);
  }

  async function handleAnalyzeTicket() {
    const trimmedCronSecret = cronSecret.trim();

    if (!trimmedCronSecret) {
      setCronTestResult({ message: "Enter the cron secret before testing analysis.", severity: "warning" });
      return;
    }

    setIsTestingAnalysis(true);
    setCronTestResult(null);

    try {
      const response = await fetch("/api/cron/analyze-matches", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-cron-secret": trimmedCronSecret,
        },
        body: JSON.stringify({}),
      });

      const body = (await response.json()) as {
        message?: string;
        ticketId?: string | number;
        pendingTicket?: { isPlayed?: boolean; message?: string };
      };

      if (!response.ok) {
        setCronTestResult({ message: body.message ?? "AI analysis test failed.", severity: "error" });
        return;
      }

      setCronTestResult({
        message: `AI analysis ticket created${body.ticketId ? `: ${body.ticketId}` : "."} ${body.pendingTicket?.message ?? "Ticket is not played yet."}`,
        severity: "success",
      });
    } catch {
      setCronTestResult({ message: "Unable to run AI analysis test.", severity: "error" });
    } finally {
      setIsTestingAnalysis(false);
    }
  }

  async function placeSelection(selection: TicketSelection): Promise<BetResult> {
    const parsedStake = Number(stake);

    if (!Number.isFinite(parsedStake) || parsedStake <= 0) {
      return {
        id: selection.id,
        message: "Enter a valid stake before placing bets.",
        placed: false,
        severity: "error",
      };
    }

    const request: PlaceTicketBetRequest = {
      currency,
      eventId: selection.eventId,
      marketUrl: selection.marketUrl,
      outcome: selection.outcome,
      price: selection.price,
      referenceId: createReferenceId(),
      stake: parsedStake,
    };

    const response = await fetch("/api/cloudbet/bets/place", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      return {
        id: selection.id,
        message: body.message ?? "Bet placement failed.",
        placed: false,
        severity: "error",
      };
    }

    const body = (await response.json()) as PlaceTicketBetApiResponse;
    const status = body.bet.status ?? body.bet.state ?? "UNKNOWN";
    const error = body.bet.error ?? body.bet.rejectionCode;
    const accepted = status === "ACCEPTED";
    const pending = status === "PENDING_ACCEPTANCE" || status === "PENDING";

    return {
      id: selection.id,
      message: `${selection.eventName}: ${status}${error ? ` - ${error}` : ""}`,
      placed: true,
      severity: accepted ? "success" : pending ? "warning" : "error",
    };
  }

  async function handlePlaceBets() {
    setIsPlacing(true);
    setResults([]);

    try {
      const betResults = await Promise.all(selections.map(placeSelection));
      setResults(betResults);

      if (betResults.length > 0 && betResults.every((result) => result.placed)) {
        clearTicketSelections();
        window.location.reload();
      }
    } finally {
      setIsPlacing(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Card sx={{ borderRadius: 4, flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">Selections</Typography>
            <Typography sx={{ fontWeight: 900 }} variant="h4">{summary.selectionsCount}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 4, flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">Total quota</Typography>
            <Typography sx={{ fontWeight: 900 }} variant="h4">{summary.totalOdds > 0 ? formatOdds(summary.totalOdds) : "—"}</Typography>
          </CardContent>
        </Card>
      </Stack>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Stake" onChange={(event) => setStake(event.target.value)} size="small" type="number" value={stake} />
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="ticket-currency-label">Currency</InputLabel>
                <Select
                  label="Currency"
                  labelId="ticket-currency-label"
                  onChange={handleCurrencyChange}
                  value={currency}
                >
                  {currencyOptions.map((currencyOption) => (
                    <MenuItem key={currencyOption.value} value={currencyOption.value}>
                      {currencyOption.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button color="inherit" disabled={selections.length === 0 || isPlacing} onClick={handleClear}>Clear</Button>
              <Button disabled={selections.length === 0 || isPlacing} onClick={handlePlaceBets} variant="contained">
                {isPlacing ? "Placing..." : "Place bets"}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontWeight: 900 }}>Test AI analysis cron</Typography>
              <Typography color="text.secondary" variant="body2">
                Fetches soccer and basketball selections with SELECTION_ENABLED status, runs analysis, and saves an unplayed pending Supabase ticket.
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}>
              <TextField
                label="Cron secret"
                onChange={(event) => setCronSecret(event.target.value)}
                size="small"
                type="password"
                value={cronSecret}
              />
              <Button disabled={isTestingAnalysis} onClick={handleAnalyzeTicket} variant="outlined">
                {isTestingAnalysis ? "Testing..." : "Test AI analysis"}
              </Button>
            </Stack>
            {cronTestResult ? <Alert severity={cronTestResult.severity}>{cronTestResult.message}</Alert> : null}
          </Stack>
        </CardContent>
      </Card>

      {results.length > 0 ? (
        <Stack spacing={1}>
          {results.map((result) => (
            <Alert key={result.id} severity={result.severity}>{result.message}</Alert>
          ))}
        </Stack>
      ) : null}

      {selections.length === 0 ? (
        <Card sx={{ borderRadius: 4 }}>
          <CardContent>
            <Typography sx={{ fontWeight: 800 }}>Ticket is empty</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>Open a match and add active odds to your ticket.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {selections.map((selection) => (
            <Card key={selection.id} sx={{ borderRadius: 4 }}>
              <CardContent>
                <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
                  <Box>
                    <Typography sx={{ fontWeight: 900 }}>{selection.eventName}</Typography>
                    <Typography color="text.secondary" variant="body2">{selection.competitionName ?? selection.sportKey}</Typography>
                  </Box>
                  <IconButton aria-label="Remove selection" onClick={() => handleRemove(selection.id)}>
                    Remove
                  </IconButton>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                  <Box>
                    <Typography sx={{ fontWeight: 800 }}>{selection.marketName} · {selection.outcome}</Typography>
                    {selection.params ? <Typography color="text.secondary" variant="body2">{formatCloudbetParam(selection.params)}</Typography> : null}
                  </Box>
                  <Chip color="success" label={formatOdds(selection.price)} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

