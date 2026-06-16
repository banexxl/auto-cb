import { NextResponse } from "next/server";
import { CloudbetApiError } from "@/lib/cloudbet/cloudbet-client";
import { placeBet } from "@/lib/cloudbet/cloudbet-service";
import type { PlaceTicketBetApiResponse, PlaceTicketBetRequest } from "@/lib/ticket-types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isAcceptPriceChange(value: string): value is PlaceTicketBetRequest["acceptPriceChange"] {
  return value === "NONE" || value === "BETTER" || value === "ANY";
}

function isPlaceBetRequest(value: unknown): value is PlaceTicketBetRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const request = value as Partial<PlaceTicketBetRequest>;

  return (
    typeof request.acceptPriceChange === "string" &&
    isAcceptPriceChange(request.acceptPriceChange) &&
    typeof request.currency === "string" &&
    typeof request.eventId === "string" &&
    typeof request.marketUrl === "string" &&
    typeof request.price === "string" &&
    typeof request.referenceId === "string" &&
    typeof request.stake === "string"
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as unknown;

  if (!isPlaceBetRequest(body)) {
    return NextResponse.json({ message: "Invalid bet placement request." }, { status: 400 });
  }

  try {
    const bet = await placeBet(body);
    const response: PlaceTicketBetApiResponse = { bet };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof CloudbetApiError) {
      return NextResponse.json(
        { message: error.message, details: error.details },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Unable to place Cloudbet bet." }, { status: 500 });
  }
}

