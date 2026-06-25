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


interface AnalyzeMatchesResponse {
  code?: string;
  message?: string;
  success?: boolean;
  status?: string;
  ticketId?: string | number;
  pendingTicket?: { isPlayed?: boolean; message?: string };
  proposedBets?: ProposedBet[];
}

interface ProposedBet {
  currency: string;
  eventId: string;
  marketUrl: string;
  outcome: string;
  price: number;
  referenceId: string;
  stake: number;
  matchName?: string;
  marketKey?: string;
  competitionName?: string;
  sportKey?: string;
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

function isNoEnabledMatchesResponse(response: Response, body: AnalyzeMatchesResponse) {
  return response.status === 400 && body.code === "NO_ENABLED_MATCHES";
}


interface EnabledSelectionPayload {
  marketKey: string;
  marketUrl: string;
  outcome: string;
  params?: string;
  price: number;
  probability?: number;
  side?: string;
  minStake?: number;
  maxStake?: number;
  status: "SELECTION_ENABLED";
}

interface EnabledMatchPayload {
  id: number;
  name: string;
  status: string;
  cutoffTime?: string;
  competitionName?: string;
  sportKey: string;
  selections: EnabledSelectionPayload[];
}

interface EnabledMatchesPayloadResponse {
  matches: EnabledMatchPayload[];
  totalMatches: number;
  totalSelections: number;
  message?: string;
}

async function fetchEnabledMatches(sport: "basketball"): Promise<EnabledMatchesPayloadResponse> {
  const response = await fetch(`/api/cloudbet/matches/${sport}-enabled`, { cache: "no-store" });
  const body = (await response.json()) as EnabledMatchesPayloadResponse;

  if (!response.ok) {
    throw new Error(body.message ?? `Unable to load enabled ${sport} matches.`);
  }

  return body;
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

  async function runAnalysisCron(matches: Array<Record<string, unknown>>): Promise<{ body: AnalyzeMatchesResponse; response: Response }> {
    const response = await fetch("/api/cron/analyze-matches", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cron-secret": cronSecret.trim(),
      },
      body: JSON.stringify({ matches }),
    });

    const body = (await response.json()) as AnalyzeMatchesResponse;
    return { body, response };
  }

  function mapMatchesToCandidateSelections(matches: EnabledMatchPayload[]) {
    const candidateSelections: Array<Record<string, unknown>> = [];

    matches.forEach((match) => {
      match.selections.forEach((selection) => {
        candidateSelections.push({
          candidateId: `${match.id}:${selection.marketUrl}:${selection.outcome}`,
          matchId: match.id,
          marketUrl: selection.marketUrl,
          outcome: selection.outcome,
          price: selection.price,
          status: selection.status,
          minStake: selection.minStake ?? 0,
          maxStake: selection.maxStake ?? 0,
          sportKey: match.sportKey,
          matchName: match.name,
          competitionName: match.competitionName,
          marketKey: selection.marketKey,
          params: selection.params,
          side: selection.side,
          probability: selection.probability,
          cutoffTime: match.cutoffTime,
        });
      });
    });

    return candidateSelections;
  }

  function formatNoEnabledMatchesMessage(body: AnalyzeMatchesResponse, response: Response) {
    if (!isNoEnabledMatchesResponse(response, body)) {
      return `AI analysis ticket created${body.ticketId ? `: ${body.ticketId}` : "."}`;
    }

    return `No enabled basketball matches found. Default no-bet ticket saved${body.ticketId ? `: ${body.ticketId}` : "."} ${body.message ?? "Analysis was not started."}`;
  }

  async function placeProposedBet(proposedBet: ProposedBet): Promise<BetResult> {
    const referenceId = createReferenceId();

    try {
      const response = await fetch("/api/cloudbet/bets/place", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currency: proposedBet.currency,
          eventId: proposedBet.eventId,
          marketUrl: proposedBet.marketUrl,
          outcome: proposedBet.outcome,
          price: proposedBet.price,
          referenceId,
          stake: proposedBet.stake,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        return {
          id: referenceId,
          message: `${proposedBet.matchName ?? proposedBet.eventId}: ${body.message ?? "Bet placement failed."}`,
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
        id: referenceId,
        message: `${proposedBet.matchName ?? proposedBet.eventId}: ${status}${error ? ` - ${error}` : ""}`,
        placed: true,
        severity: accepted ? "success" : pending ? "warning" : "error",
      };
    } catch {
      return {
        id: referenceId,
        message: `${proposedBet.matchName ?? proposedBet.eventId}: bet placement request failed.`,
        placed: false,
        severity: "error",
      };
    }
  }

  async function handleAnalyzeTicket() {
    const trimmedCronSecret = cronSecret.trim();

    if (!trimmedCronSecret) {
      setCronTestResult({ message: "Enter the cron secret before testing analysis.", severity: "warning" });
      return;
    }

    setIsTestingAnalysis(true);
    setCronTestResult(null);
    setResults([]);

    try {
      const basketball = await fetchEnabledMatches("basketball");

      if (basketball.matches.length === 0) {
        const { body, response } = await runAnalysisCron([]);
        setCronTestResult({ message: formatNoEnabledMatchesMessage(body, response), severity: "warning" });
        return;
      }

      const randomMatch = basketball.matches[Math.floor(Math.random() * basketball.matches.length)];
      const candidateSelections = mapMatchesToCandidateSelections([randomMatch]);

      if (candidateSelections.length === 0) {
        const { body, response } = await runAnalysisCron([]);
        setCronTestResult({ message: formatNoEnabledMatchesMessage(body, response), severity: "warning" });
        return;
      }

      const { body, response } = await runAnalysisCron(candidateSelections);

      if (isNoEnabledMatchesResponse(response, body)) {
        setCronTestResult({ message: formatNoEnabledMatchesMessage(body, response), severity: "warning" });
        return;
      }

      if (!response.ok) {
        setCronTestResult({ message: body.message ?? "AI analysis test failed.", severity: "error" });
        return;
      }

      const proposedBets = body.proposedBets ?? [];
      const placeResults = await Promise.all(proposedBets.map((proposedBet) => placeProposedBet(proposedBet)));

      if (placeResults.length > 0) {
        setResults(placeResults);
      }

      const acceptedCount = placeResults.filter((result: BetResult) => result.severity === "success").length;
      const placedAny = acceptedCount > 0;

      setCronTestResult({
        message: `AI analysis ticket created${body.ticketId ? `: ${body.ticketId}` : "."} ${proposedBets.length === 0 ? "No selections met the criteria." : `Placed ${acceptedCount}/${proposedBets.length} bet(s) on Cloudbet.`}`,
        severity: response.ok ? (proposedBets.length === 0 ? "warning" : placedAny ? "success" : "warning") : "error",
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
                Checks for enabled basketball matches, runs analysis only when matches exist, and saves an unplayed pending Supabase ticket.
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

