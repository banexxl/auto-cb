"use client";

import { Alert, Box, Button, Card, CardContent, Chip, Divider, FormControlLabel, Grid, Snackbar, Stack, Switch, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import type { TicketSelection } from "@/lib/ticket-types";
import { addTicketSelection, readTicketSelections } from "@/utils/ticket-client";
import { getTicketSelectionKey } from "@/utils/ticket";
import type {
  CloudbetMarket,
  CloudbetMatchDetails,
  CloudbetOddsSelection,
  CloudbetOutcomeProbability,
} from "@/lib/cloudbet/cloudbet-types";
import {
  formatCloudbetMarketKey,
  formatCloudbetOutcome,
  formatCloudbetParam,
} from "@/utils/cloudbet-formatters";

interface MatchDetailsProps {
  match: CloudbetMatchDetails;
}

interface OpinionGroup {
  key: string;
  selections: CloudbetOutcomeProbability[];
}

interface MarketViewModel {
  key: string;
  market: CloudbetMarket;
  allSelections: CloudbetOddsSelection[];
  activeSelections: CloudbetOddsSelection[];
  visibleSelections: CloudbetOddsSelection[];
}

function formatDateTime(value?: string) {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

function getSelections(market: CloudbetMarket): CloudbetOddsSelection[] {
  if (market.selections?.length) {
    return market.selections;
  }

  return Object.values(market.submarkets ?? {}).flatMap((submarket) => submarket.selections ?? []);
}

function getOpinionGroups(match: CloudbetMatchDetails): OpinionGroup[] {
  const groupedOpinions = Object.entries(match.metadata?.opinions ?? {}).map(([key, opinion]) => ({
    key,
    selections: opinion.categories ?? [],
  }));

  if (groupedOpinions.length > 0) {
    return groupedOpinions;
  }

  const flatOpinions = match.metadata?.opinion ?? [];
  const groups = new Map<string, CloudbetOutcomeProbability[]>();

  flatOpinions.forEach((opinion) => {
    const group = groups.get(opinion.marketKey) ?? [];
    group.push(opinion);
    groups.set(opinion.marketKey, group);
  });

  return Array.from(groups.entries()).map(([key, selections]) => ({ key, selections }));
}

function formatProbability(probability: number) {
  return `${(probability * 100).toFixed(1)}%`;
}

function isSelectionActive(selection: CloudbetOddsSelection) {
  return selection.price > 0 && selection.status !== "SELECTION_DISABLED";
}

function sortSelectionsByAvailability(selections: CloudbetOddsSelection[]) {
  return [...selections].sort((left, right) => Number(isSelectionActive(right)) - Number(isSelectionActive(left)));
}

function getSelectionChip(selection: CloudbetOddsSelection) {
  if (!isSelectionActive(selection)) {
    return <Chip color="default" label="Locked" size="small" variant="outlined" />;
  }

  return <Chip color="success" label={selection.price.toFixed(3)} size="small" />;
}

function buildMarketViewModels(
  markets: [string, CloudbetMarket][],
  showOnlyActiveOdds: boolean,
): MarketViewModel[] {
  return markets
    .map(([key, market]) => {
      const allSelections = getSelections(market);
      const activeSelections = allSelections.filter(isSelectionActive);
      const visibleSelections = showOnlyActiveOdds
        ? activeSelections
        : sortSelectionsByAvailability(allSelections);

      return {
        key,
        market,
        allSelections,
        activeSelections,
        visibleSelections: visibleSelections.slice(0, 8),
      };
    })
    .filter((market) => !showOnlyActiveOdds || market.activeSelections.length > 0);
}

function renderOpinionGroups(opinionGroups: OpinionGroup[]) {
  if (opinionGroups.length === 0) {
    return null;
  }

  return (
    <Grid container spacing={2}>
      {opinionGroups.map((group) => (
        <Grid key={group.key} size={{ xs: 12, md: 6, lg: 4 }}>
          <Card sx={{ borderRadius: 4, height: "100%" }}>
            <CardContent>
              <Typography sx={{ fontWeight: 900 }}>{formatCloudbetMarketKey(group.key)}</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
                Market probabilities
              </Typography>
              <Stack spacing={1}>
                {group.selections.slice(0, 8).map((selection) => (
                  <Stack
                    key={`${selection.marketKey}-${selection.outcome}-${selection.params ?? "default"}`}
                    sx={{ alignItems: "center", bgcolor: "grey.100", borderRadius: 2, flexDirection: "row", justifyContent: "space-between", px: 1.5, py: 1 }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 800 }}>{formatCloudbetOutcome(selection.outcome)}</Typography>
                      {selection.params ? (
                        <Typography color="text.secondary" variant="caption">{formatCloudbetParam(selection.params)}</Typography>
                      ) : null}
                    </Box>
                    <Chip color="info" label={formatProbability(selection.probability)} size="small" />
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export function MatchDetails({ match }: MatchDetailsProps) {
  const [showOnlyActiveOdds, setShowOnlyActiveOdds] = useState(true);
  const [ticketAlert, setTicketAlert] = useState<{ message: string; severity: "success" | "warning" | "error" } | null>(null);
  const markets = useMemo(() => Object.entries(match.markets ?? {}).slice(0, 12), [match.markets]);
  const opinionGroups = useMemo(() => getOpinionGroups(match).slice(0, 12), [match]);
  const allSelections = useMemo(() => markets.flatMap(([, market]) => getSelections(market)), [markets]);
  const activeSelectionsCount = allSelections.filter(isSelectionActive).length;
  const allLinesDisabled = allSelections.length > 0 && activeSelectionsCount === 0;
  const visibleMarkets = buildMarketViewModels(markets, showOnlyActiveOdds);

  function handleAddToTicket(marketKey: string, market: CloudbetMarket, selection: CloudbetOddsSelection) {
    if (!selection.marketUrl || !isSelectionActive(selection)) {
      setTicketAlert({ message: "Unable to add this selection to your ticket.", severity: "error" });
      return;
    }

    const ticketSelection: TicketSelection = {
      id: getTicketSelectionKey({ eventId: String(match.id), marketUrl: selection.marketUrl }),
      addedAt: new Date().toISOString(),
      competitionName: match.competition?.name,
      eventId: String(match.id),
      eventName: match.name,
      marketKey,
      marketName: market.name ? formatCloudbetMarketKey(market.name) : formatCloudbetMarketKey(marketKey),
      marketUrl: selection.marketUrl,
      outcome: formatCloudbetOutcome(selection.outcome),
      params: selection.params ? formatCloudbetParam(selection.params) : undefined,
      price: selection.price,
      side: selection.side,
      sportKey: match.sport?.key ?? "soccer",
    };

    try {
      const matchAlreadyAdded = readTicketSelections().some((selection) => selection.eventId === ticketSelection.eventId);

      if (matchAlreadyAdded) {
        setTicketAlert({ message: "This match is already in your ticket.", severity: "warning" });
        return;
      }

      addTicketSelection(ticketSelection);
      setTicketAlert({ message: "Selection added to your ticket.", severity: "success" });
    } catch {
      setTicketAlert({ message: "Unable to add this selection to your ticket.", severity: "error" });
    }
  }

  return (
    <Stack spacing={3}>
      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack spacing={3} sx={{ flexDirection: { xs: "column", md: "row" }, justifyContent: "space-between" }}>
            <Box>
              <Typography color="text.secondary" variant="body2">
                Match #{match.id}
              </Typography>
              <Typography component="h1" sx={{ fontWeight: 900, mt: 1 }} variant="h4">
                {match.name}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {match.competition?.name ?? "Unknown competition"} · {match.sport?.name ?? match.sport?.key ?? "Sport"}
              </Typography>
            </Box>
            <Stack spacing={1} sx={{ alignItems: { xs: "flex-start", md: "flex-end" } }}>
              <Chip color={match.status === "TRADING_LIVE" ? "success" : "primary"} label={match.status.replaceAll("_", " ")} />
              <Typography color="text.secondary">Starts {formatDateTime(match.cutoffTime)}</Typography>
            </Stack>
          </Stack>
          <Divider sx={{ my: 3 }} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography color="text.secondary" variant="body2">Home</Typography>
              <Typography sx={{ fontWeight: 800 }} variant="h6">{match.home?.name ?? "Unknown home team"}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography color="text.secondary" variant="body2">Away</Typography>
              <Typography sx={{ fontWeight: 800 }} variant="h6">{match.away?.name ?? "Unknown away team"}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Stack sx={{ alignItems: { xs: "flex-start", sm: "center" }, flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", gap: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 900 }} variant="h5">
                Markets & Odds
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {activeSelectionsCount}/{allSelections.length} active selections
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={showOnlyActiveOdds}
                  onChange={(event) => setShowOnlyActiveOdds(event.target.checked)}
                />
              }
              label="Show only active odds"
            />
          </Stack>
        </Stack>

        {markets.length > 0 && visibleMarkets.length > 0 ? (
          <Grid container spacing={2}>
            {visibleMarkets.map(({ key, market, allSelections: marketSelections, activeSelections, visibleSelections }) => (
              <Grid key={key} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card sx={{ borderRadius: 4, height: "100%" }}>
                  <CardContent>
                    <Stack spacing={1} sx={{ mb: 2 }}>
                      <Typography sx={{ fontWeight: 900 }}>
                        {market.name ? formatCloudbetMarketKey(market.name) : formatCloudbetMarketKey(key)}
                      </Typography>
                      <Stack spacing={1} sx={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap" }}>
                        <Chip label={formatCloudbetMarketKey(key)} size="small" variant="outlined" />
                        <Chip
                          color={activeSelections.length > 0 ? "success" : "default"}
                          label={`${activeSelections.length}/${marketSelections.length} active`}
                          size="small"
                        />
                      </Stack>
                    </Stack>
                    <Stack spacing={1}>
                      {visibleSelections.map((selection) => (
                        <Stack
                          key={`${selection.outcome}-${selection.params ?? "default"}-${selection.side ?? "back"}`}
                          sx={{ alignItems: "center", bgcolor: isSelectionActive(selection) ? "#ecfdf5" : "grey.100", borderRadius: 2, flexDirection: "row", justifyContent: "space-between", px: 1.5, py: 1 }}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 800 }}>{formatCloudbetOutcome(selection.outcome)}</Typography>
                            <Stack spacing={0.5} sx={{ mt: 0.25 }}>
                              {selection.params ? (
                                <Typography color="text.secondary" variant="caption">{formatCloudbetParam(selection.params)}</Typography>
                              ) : null}
                              {!isSelectionActive(selection) ? (
                                <Typography color="text.secondary" variant="caption">Cloudbet API returned disabled line</Typography>
                              ) : null}
                            </Stack>
                          </Box>
                          <Stack spacing={1} sx={{ alignItems: "flex-end" }}>
                            {getSelectionChip(selection)}
                            {isSelectionActive(selection) ? (
                              <Button onClick={() => handleAddToTicket(key, market, selection)} size="small" variant="outlined">
                                Add
                              </Button>
                            ) : null}
                          </Stack>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : markets.length > 0 && showOnlyActiveOdds ? (
          <Stack spacing={2}>
            <Card sx={{ borderRadius: 4 }}>
              <CardContent>
                <Typography sx={{ fontWeight: 800 }}>No active odds available</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {allLinesDisabled
                    ? "Cloudbet returned market structures, but every refreshed line is disabled for this API key. Turn off the filter to inspect locked lines."
                    : "No active selections match the current filter. Turn off the filter to inspect locked lines."}
                </Typography>
              </CardContent>
            </Card>
            {renderOpinionGroups(opinionGroups)}
          </Stack>
        ) : opinionGroups.length > 0 ? (
          <Stack spacing={2}>
            <Card sx={{ borderRadius: 4 }}>
              <CardContent>
                <Typography sx={{ fontWeight: 800 }}>No tradable odds returned</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Cloudbet returned market opinion probabilities for this event, but no active odds selections.
                </Typography>
              </CardContent>
            </Card>
            {renderOpinionGroups(opinionGroups)}
          </Stack>
        ) : (
          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Typography sx={{ fontWeight: 800 }}>No markets available</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Cloudbet did not return active markets or market opinions for this match.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
      <Snackbar
        anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
        autoHideDuration={3500}
        onClose={() => setTicketAlert(null)}
        open={ticketAlert !== null}
      >
        <Alert onClose={() => setTicketAlert(null)} severity={ticketAlert?.severity ?? "success"} variant="filled">
          {ticketAlert?.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}


