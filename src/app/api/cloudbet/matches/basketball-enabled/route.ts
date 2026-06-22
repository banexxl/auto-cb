import { NextResponse } from "next/server";
import { CloudbetApiError } from "@/lib/cloudbet/cloudbet-client";
import { getAvailableMatches, getMatchById } from "@/lib/cloudbet/cloudbet-service";
import type { CloudbetMarket, CloudbetMatch, CloudbetOddsSelection } from "@/lib/cloudbet/cloudbet-types";

export const dynamic = "force-dynamic";

interface EnabledBasketballSelection {
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

interface EnabledBasketballMatch {
  id: number;
  name: string;
  status: CloudbetMatch["status"];
  cutoffTime?: string;
  competitionName?: string;
  sportKey: "basketball";
  selections: EnabledBasketballSelection[];
}

interface EnabledBasketballMatchesResponse {
  matches: EnabledBasketballMatch[];
  totalMatches: number;
  totalSelections: number;
}

function getSelections(market: CloudbetMarket): CloudbetOddsSelection[] {
  if (market.selections?.length) {
    return market.selections;
  }

  return Object.values(market.submarkets ?? {}).flatMap((submarket) => submarket.selections ?? []);
}

function getEnabledSelections(match: CloudbetMatch): EnabledBasketballSelection[] {
  return Object.entries(match.markets ?? {}).flatMap(([marketKey, market]) =>
    getSelections(market).flatMap((selection) => {
      if (selection.status !== "SELECTION_ENABLED" || !selection.marketUrl) {
        return [];
      }

      return {
        marketKey,
        marketUrl: selection.marketUrl,
        outcome: selection.outcome,
        params: selection.params,
        price: selection.price,
        probability: selection.probability,
        side: selection.side,
        minStake: selection.minStake,
        maxStake: selection.maxStake,
        status: selection.status,
      };
    }),
  );
}

function toEnabledBasketballMatch(match: CloudbetMatch): EnabledBasketballMatch | null {
  const selections = getEnabledSelections(match);

  if (selections.length === 0) {
    return null;
  }

  return {
    id: match.id,
    name: match.name,
    status: match.status,
    cutoffTime: match.cutoffTime,
    competitionName: match.competition?.name,
    sportKey: "basketball",
    selections,
  };
}

function getSafeLimit(request: Request) {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");

  if (!limitParam) {
    return 50;
  }

  const limit = Number(limitParam);
  return Number.isInteger(limit) && limit > 0 && limit <= 1000 ? limit : 50;
}

export async function GET(request: Request) {
  const limit = getSafeLimit(request);

  try {
    const matches = await getAvailableMatches({ sport: "basketball", limit });
    const settledMatches = await Promise.allSettled(
      matches.map((match) => getMatchById(String(match.id), { sport: "basketball" })),
    );
    const enabledMatches = settledMatches
      .flatMap((settledMatch, index) => {
        const match = settledMatch.status === "fulfilled" ? settledMatch.value : matches[index];
        const enabledMatch = toEnabledBasketballMatch(match);
        return enabledMatch ? [enabledMatch] : [];
      })
      .sort((left, right) => {
        const leftTime = left.cutoffTime ? new Date(left.cutoffTime).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.cutoffTime ? new Date(right.cutoffTime).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      });

    const response: EnabledBasketballMatchesResponse = {
      matches: enabledMatches,
      totalMatches: enabledMatches.length,
      totalSelections: enabledMatches.reduce((total, match) => total + match.selections.length, 0),
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof CloudbetApiError) {
      return NextResponse.json(
        { message: error.message, details: error.details },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Unable to fetch enabled basketball matches." }, { status: 500 });
  }
}
