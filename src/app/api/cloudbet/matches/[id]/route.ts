import { NextResponse } from "next/server";
import { CloudbetApiError } from "@/lib/cloudbet/cloudbet-client";
import { getMatchById } from "@/lib/cloudbet/cloudbet-service";
import type { MatchApiResponse } from "@/lib/cloudbet/cloudbet-types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const sport = url.searchParams.get("sport") ?? "soccer";

  try {
    const match = await getMatchById(id, { sport });
    const response: MatchApiResponse = { match };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof CloudbetApiError) {
      return NextResponse.json(
        { message: error.message, details: error.details },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Unable to fetch Cloudbet match details." }, { status: 500 });
  }
}
