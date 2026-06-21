import { NextResponse } from "next/server";
import { CloudbetApiError } from "@/lib/cloudbet/cloudbet-client";
import { placeBet } from "@/lib/cloudbet/cloudbet-service";
import type { PlaceTicketBetApiResponse, PlaceTicketBetRequest } from "@/lib/ticket-types";

export const dynamic = "force-dynamic";

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isPlaceBetRequest(value: unknown): value is PlaceTicketBetRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const request = value as Partial<PlaceTicketBetRequest>;

  return (
    typeof request.currency === "string" &&
    typeof request.eventId === "string" &&
    typeof request.marketUrl === "string" &&
    typeof request.outcome === "string" &&
    isPositiveNumber(request.price) &&
    typeof request.referenceId === "string" &&
    isPositiveNumber(request.stake)
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid bet placement request." }, { status: 400 });
  }

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
