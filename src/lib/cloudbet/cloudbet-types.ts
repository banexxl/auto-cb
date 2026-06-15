export type EventStatus =
  | "PRE_TRADING"
  | "TRADING"
  | "TRADING_LIVE"
  | "RESULTED"
  | "INTERRUPTED"
  | "AWAITING_RESULTS"
  | "POST_TRADING"
  | "CANCELLED";

export type SelectionStatus = "SELECTION_DISABLED" | "SELECTION_ENABLED";

export type SelectionSide = "BACK" | "LAY";

export interface CloudbetIdentifier {
  key: string;
  name: string;
}

export interface CloudbetSport extends CloudbetIdentifier {
  competitionCount?: number;
  eventCount?: number;
}

export interface CloudbetTeam extends CloudbetIdentifier {
  abbreviation?: string;
  country?: string;
}

export interface CloudbetCompetition extends CloudbetIdentifier {
  category?: CloudbetIdentifier;
  events?: CloudbetMatch[];
}

export interface CloudbetCompetitionWithCategory extends CloudbetIdentifier {
  category?: CloudbetIdentifier;
  eventCount?: number;
}

export interface CloudbetOddsSelection {
  outcome: string;
  params?: string;
  price: number;
  side?: SelectionSide;
  status?: SelectionStatus;
  marketUrl?: string;
  probability?: number;
  maxStake?: number;
  minStake?: number;
}

export interface CloudbetLineRequest {
  eventId: string;
  marketUrl: string;
}

export interface CloudbetLineResponse extends CloudbetOddsSelection {}

export interface CloudbetSubmarket {
  sequence?: number;
  selections?: CloudbetOddsSelection[];
}

export interface CloudbetMarket {
  key?: string;
  name?: string;
  sequence?: number;
  submarkets?: Record<string, CloudbetSubmarket>;
  selections?: CloudbetOddsSelection[];
}

export interface CloudbetOutcomeProbability {
  marketKey: string;
  outcome: string;
  params?: string;
  probability: number;
}

export interface CloudbetOpinionCategory {
  categories?: CloudbetOutcomeProbability[];
}

export interface CloudbetEventMetadata {
  venue?: string;
  country?: string;
  round?: string;
  opinion?: CloudbetOutcomeProbability[];
  opinions?: Record<string, CloudbetOpinionCategory>;
}

export interface CloudbetMatch {
  id: number;
  key: string;
  name: string;
  status: EventStatus;
  cutoffTime?: string;
  endTime?: string;
  resultedTime?: string;
  home?: CloudbetTeam;
  away?: CloudbetTeam;
  sport?: CloudbetIdentifier;
  competition?: CloudbetCompetitionWithCategory;
  markets?: Record<string, CloudbetMarket>;
  metadata?: CloudbetEventMetadata;
  sequence?: number;
  type?: number;
}

export interface CloudbetMatchDetails extends CloudbetMatch {
  gradingDuration?: number;
}

export interface CloudbetSportsResponse {
  sports?: CloudbetSport[];
}

export interface CloudbetFixturesResponse {
  events?: CloudbetMatch[];
  competitions?: CloudbetCompetition[];
}

export interface CloudbetEventResponse extends CloudbetMatchDetails {}

export interface CloudbetErrorResponse {
  code?: string;
  message?: string;
  status?: string;
}

export interface MatchesSummary {
  totalMatches: number;
  liveMatches: number;
  upcomingMatches: number;
  marketsCount: number;
}

export interface MatchesApiResponse {
  matches: CloudbetMatch[];
  summary: MatchesSummary;
  sport: string;
}

export interface MatchApiResponse {
  match: CloudbetMatchDetails;
}


