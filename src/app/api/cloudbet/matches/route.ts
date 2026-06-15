import { NextResponse } from "next/server";
import { CloudbetApiError } from "@/lib/cloudbet/cloudbet-client";
import { getAvailableMatches, summarizeMatches } from "@/lib/cloudbet/cloudbet-service";
import type { MatchesApiResponse } from "@/lib/cloudbet/cloudbet-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sport = url.searchParams.get("sport") ?? "soccer";
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const markets = url.searchParams.getAll("markets");

  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 10000)) {
    return NextResponse.json({ message: "limit must be an integer from 1 to 10000." }, { status: 400 });
  }

  try {
    const matches = await getAvailableMatches({
      sport,
      limit,
      markets: markets.length > 0 ? markets : undefined,
    });
    const response: MatchesApiResponse = {
      matches,
      summary: summarizeMatches(matches),
      sport,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof CloudbetApiError) {
      return NextResponse.json(
        { message: error.message, details: error.details },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Unable to fetch Cloudbet matches." }, { status: 500 });
  }
}
