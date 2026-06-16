export interface TicketSelection {
  id: string;
  eventId: string;
  eventName: string;
  sportKey: string;
  competitionName?: string;
  marketKey: string;
  marketName: string;
  marketUrl: string;
  outcome: string;
  params?: string;
  price: number;
  side?: string;
  addedAt: string;
}

export interface TicketSummary {
  selectionsCount: number;
  totalOdds: number;
}

export interface PlaceTicketBetRequest {
  acceptPriceChange: "NONE" | "BETTER" | "ANY";
  currency: string;
  eventId: string;
  marketUrl: string;
  price: string;
  referenceId: string;
  stake: string;
}

export interface PlaceTicketBetResponse {
  referenceId: string;
  price: string;
  eventId: string;
  marketUrl: string;
  side: string;
  currency: string;
  stake: string;
  status: string;
  error: string;
}

export interface PlaceTicketBetApiResponse {
  bet: PlaceTicketBetResponse;
}
