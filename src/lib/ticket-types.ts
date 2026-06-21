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
  currency: string;
  eventId: string;
  marketUrl: string;
  outcome: string;
  price: number;
  referenceId: string;
  stake: number;
}

export interface PlaceTicketBetResponse {
  referenceId: string;
  price?: string | number;
  eventId?: string;
  marketUrl: string;
  outcome?: string;
  side?: string;
  currency: string;
  stake?: string | number;
  status?: string;
  state?: string;
  error?: string;
  rejectionCode?: string;
}

export interface PlaceTicketBetApiResponse {
  bet: PlaceTicketBetResponse;
}

