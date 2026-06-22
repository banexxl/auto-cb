import { CloudbetApiError, cloudbetGet, cloudbetPost } from "./cloudbet-client";
import type { PlaceTicketBetRequest, PlaceTicketBetResponse } from "@/lib/ticket-types";
import type {
  CloudbetCompetition,
  CloudbetEventResponse,
  CloudbetFixturesResponse,
  CloudbetLineRequest,
  CloudbetLineResponse,
  CloudbetMatch,
  CloudbetMatchDetails,
  CloudbetOddsSelection,
  CloudbetSport,
  CloudbetSportsResponse,
  MatchesSummary,
} from "./cloudbet-types";

const DEFAULT_SPORT = "soccer";
const DEFAULT_WINDOW_DAYS = 7;
const DEFAULT_LIMIT = 1000;
const MAX_LINE_REFRESH_SELECTIONS = 60;

const DEFAULT_MARKETS_BY_SPORT: Record<string, readonly string[]> = {
  baseball: ["baseball.moneyline", "baseball.totals", "baseball.runLine"],
  basketball: ["basketball.moneyline", "basketball.handicap", "basketball.totals"],
  soccer: ["soccer.match_odds", "soccer.asian_handicap", "soccer.total_goals"],
  tennis: ["tennis.matchOdds", "tennis.setBetting", "tennis.totalGames"],
};

function getDefaultMarkets(sport: string) {
  return DEFAULT_MARKETS_BY_SPORT[sport] ?? DEFAULT_MARKETS_BY_SPORT[DEFAULT_SPORT];
}

function getEpochSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

function getDefaultWindow() {
  const now = new Date();
  const future = new Date(now);
  future.setDate(future.getDate() + DEFAULT_WINDOW_DAYS);

  return {
    from: getEpochSeconds(now),
    to: getEpochSeconds(future),
  };
}

function sortMatchesByCutoff(matches: CloudbetMatch[]) {
  return [...matches].sort((left, right) => {
    const leftTime = left.cutoffTime ? new Date(left.cutoffTime).getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = right.cutoffTime ? new Date(right.cutoffTime).getTime() : Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });
}

function attachCompetition(match: CloudbetMatch, competition: CloudbetCompetition, sport: string): CloudbetMatch {
  return {
    ...match,
    competition: match.competition ?? {
      category: competition.category,
      key: competition.key,
      name: competition.name,
      eventCount: competition.events?.length,
    },
    sport: match.sport ?? {
      key: sport,
      name: sport.charAt(0).toUpperCase() + sport.slice(1),
    },
  };
}

function extractMatchesFromFixtures(response: CloudbetFixturesResponse, sport: string): CloudbetMatch[] {
  const topLevelMatches = response.events ?? [];
  const competitionMatches = (response.competitions ?? []).flatMap((competition) =>
    (competition.events ?? []).map((match) => attachCompetition(match, competition, sport)),
  );

  const matches = new Map<number, CloudbetMatch>();
  [...topLevelMatches, ...competitionMatches].forEach((match) => {
    matches.set(match.id, match);
  });

  return sortMatchesByCutoff(Array.from(matches.values()));
}

function getMarketsCount(match: CloudbetMatch) {
  return Object.keys(match.markets ?? {}).length;
}

function getSelectionCandidates(match: CloudbetMatch) {
  return Object.entries(match.markets ?? {}).flatMap(([, market]) =>
    Object.values(market.submarkets ?? {}).flatMap((submarket) =>
      (submarket.selections ?? []).filter((selection) => selection.marketUrl),
    ),
  );
}

function isPositiveLine(line: CloudbetLineResponse) {
  return line.price > 0 && line.status !== "SELECTION_DISABLED";
}

function applyLineToSelection(selection: CloudbetOddsSelection, line: CloudbetLineResponse) {
  selection.price = line.price;
  selection.probability = line.probability;
  selection.status = line.status;
  selection.side = line.side;
  selection.maxStake = line.maxStake;
  selection.minStake = line.minStake;
}

function logSettledLineResponses(
  matchId: number,
  candidates: CloudbetOddsSelection[],
  settledLines: PromiseSettledResult<CloudbetLineResponse>[],
) {
  const summary = settledLines.reduce(
    (currentSummary, settledLine) => {
      if (settledLine.status === "rejected") {
        return {
          ...currentSummary,
          rejectedCount: currentSummary.rejectedCount + 1,
        };
      }

      return {
        fulfilledCount: currentSummary.fulfilledCount + 1,
        rejectedCount: currentSummary.rejectedCount,
        activeCount:
          currentSummary.activeCount + (isPositiveLine(settledLine.value) ? 1 : 0),
        disabledCount:
          currentSummary.disabledCount +
          (settledLine.value.status === "SELECTION_DISABLED" ? 1 : 0),
        zeroPriceCount:
          currentSummary.zeroPriceCount + (settledLine.value.price <= 0 ? 1 : 0),
      };
    },
    {
      fulfilledCount: 0,
      rejectedCount: 0,
      activeCount: 0,
      disabledCount: 0,
      zeroPriceCount: 0,
    },
  );

  console.info(
    "[auto-cb:settledLines:summary]",
    JSON.stringify({
      matchId,
      candidatesCount: candidates.length,
      ...summary,
    }),
  );


  settledLines.forEach((settledLine, index) => {
    const candidate = candidates[index];

    if (settledLine.status === "rejected") {
      const reason = settledLine.reason;
      console.warn(
        "[auto-cb:settledLines:rejected]",
        JSON.stringify({
          matchId,
          index,
          marketUrl: candidate.marketUrl,
          error: reason instanceof Error ? reason.message : "Unknown settled line error",
        }),
      );
      return;
    }

    console.info(
      "[auto-cb:settledLines:fulfilled]",
      JSON.stringify({
        matchId,
        index,
        marketUrl: candidate.marketUrl,
        outcome: candidate.outcome,
        params: candidate.params,
        price: settledLine.value.price,
        probability: settledLine.value.probability,
        status: settledLine.value.status,
        side: settledLine.value.side,
        minStake: settledLine.value.minStake,
        maxStake: settledLine.value.maxStake,
      }),
    );
  });
}

async function refreshMatchLinePrices(match: CloudbetMatchDetails): Promise<CloudbetMatchDetails> {
  const candidates = getSelectionCandidates(match).slice(0, MAX_LINE_REFRESH_SELECTIONS);

  if (candidates.length === 0) {
    return match;
  }

  const settledLines = await Promise.allSettled(
    candidates.map((selection) =>
      cloudbetPost<CloudbetLineResponse, CloudbetLineRequest>("/v2/odds/lines", {
        body: {
          eventId: String(match.id),
          marketUrl: selection.marketUrl ?? "",
        },
      }),
    ),
  );

  logSettledLineResponses(match.id, candidates, settledLines);

  settledLines.forEach((settledLine, index) => {
    if (settledLine.status === "rejected") {
      return;
    }

    applyLineToSelection(candidates[index], settledLine.value);
  });

  return match;
}

export function summarizeMatches(matches: CloudbetMatch[]): MatchesSummary {
  return matches.reduce<MatchesSummary>(
    (summary, match) => ({
      totalMatches: summary.totalMatches + 1,
      liveMatches: summary.liveMatches + (match.status === "TRADING_LIVE" ? 1 : 0),
      upcomingMatches:
        summary.upcomingMatches +
        (match.status === "TRADING" || match.status === "PRE_TRADING" ? 1 : 0),
      marketsCount: summary.marketsCount + Object.keys(match.markets ?? {}).length,
    }),
    {
      totalMatches: 0,
      liveMatches: 0,
      upcomingMatches: 0,
      marketsCount: 0,
    },
  );
}

type CloudbetPlaceBetRequest = Omit<PlaceTicketBetRequest, "outcome" | "price" | "stake"> & {
  acceptPriceChange: "BETTER";
  price: string;
  stake: string;
};

export async function placeBet(request: PlaceTicketBetRequest): Promise<PlaceTicketBetResponse> {
  const cloudbetRequest: CloudbetPlaceBetRequest = {
    acceptPriceChange: "BETTER",
    currency: request.currency,
    eventId: request.eventId,
    marketUrl: request.marketUrl,
    price: String(request.price),
    referenceId: request.referenceId,
    stake: String(request.stake),
  };

  return cloudbetPost<PlaceTicketBetResponse, CloudbetPlaceBetRequest>("/v3/bets/place", {
    body: cloudbetRequest,
  });
}

export async function getSports(): Promise<CloudbetSport[]> {
  const response = await cloudbetGet<CloudbetSportsResponse>("/v2/odds/sports");

  return [...(response.sports ?? [])]
    .filter((sport) => sport.eventCount === undefined || sport.eventCount > 0)
    .sort((left, right) => left.name.localeCompare(right.name));
}
export interface MatchQueryOptions {
  sport?: string;
  limit?: number;
  markets?: readonly string[];
}

export async function getAllMatches(options: MatchQueryOptions = {}): Promise<CloudbetMatch[]> {
  const sport = options.sport ?? DEFAULT_SPORT;
  const markets = options.markets ?? getDefaultMarkets(sport);
  const { from, to } = getDefaultWindow();

  const response = await cloudbetGet<CloudbetFixturesResponse>("/v2/odds/events", {
    query: {
      sport,
      from,
      to,
      limit: options.limit ?? DEFAULT_LIMIT,
      markets,
    },
  });

  return extractMatchesFromFixtures(response, sport);
}

export async function getAvailableMatches(options: MatchQueryOptions = {}): Promise<CloudbetMatch[]> {
  const sport = options.sport ?? DEFAULT_SPORT;
  const markets = options.markets ?? getDefaultMarkets(sport);
  const upcomingMatches = await getAllMatches({ ...options, markets });
  const liveResponse = await cloudbetGet<CloudbetFixturesResponse>("/v2/odds/events", {
    query: {
      sport,
      live: true,
      limit: options.limit ?? DEFAULT_LIMIT,
      markets,
    },
  });

  const liveMatches = extractMatchesFromFixtures(liveResponse, sport);
  const mergedMatches = new Map<number, CloudbetMatch>();
  [...liveMatches, ...upcomingMatches].forEach((match) => {
    mergedMatches.set(match.id, match);
  });

  return sortMatchesByCutoff(Array.from(mergedMatches.values()));
}

export interface MatchDetailsOptions {
  sport?: string;
  markets?: readonly string[];
}

export async function getMatchById(
  matchId: string,
  options: MatchDetailsOptions = {},
): Promise<CloudbetMatchDetails> {
  const sport = options.sport ?? DEFAULT_SPORT;
  const markets = options.markets ?? getDefaultMarkets(sport);
  const filteredMatch = await cloudbetGet<CloudbetEventResponse>(`/v2/odds/events/${encodeURIComponent(matchId)}`, {
    query: {
      markets,
    },
  });

  if (getMarketsCount(filteredMatch) > 0) {
    return refreshMatchLinePrices(filteredMatch);
  }

  const unfilteredMatch = await cloudbetGet<CloudbetEventResponse>(`/v2/odds/events/${encodeURIComponent(matchId)}`);
  return refreshMatchLinePrices(unfilteredMatch);
}






