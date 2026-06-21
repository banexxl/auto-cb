import { randomUUID } from "crypto";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getAvailableMatches, getMatchById } from "@/lib/cloudbet/cloudbet-service";
import type { CloudbetMarket, CloudbetMatch, CloudbetOddsSelection } from "@/lib/cloudbet/cloudbet-types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SPORT_ANALYST_SKILL_DIR = ".agents/skills/sport-analyst";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.5-pro";
const ANALYSIS_SPORTS = ["soccer", "basketball"] as const;
const ENABLED_SELECTION_STATUS = "SELECTION_ENABLED";
const ANALYSIS_MATCH_LIMIT_PER_SPORT = Number(process.env.CRON_ANALYSIS_MATCH_LIMIT_PER_SPORT ?? 100);

type AnalysisSport = (typeof ANALYSIS_SPORTS)[number];

type MatchSelection = {
  matchId: number;
  marketUrl: string;
  outcome: string;
  price: number;
  status: string;
  minStake: number;
  maxStake: number;
  sportKey?: string;
  matchName?: string;
  competitionName?: string;
  marketKey?: string;
  params?: string;
  side?: string;
  probability?: number;
  cutoffTime?: string;
};

type ProposedBetBody = {
  currency: "USDT";
  eventId: string;
  marketUrl: string;
  outcome: string;
  price: number;
  referenceId: string;
  stake: number;
};

type StoredMatchSelection = MatchSelection & {
  proposedBetBody: ProposedBetBody;
};

type SportTicketStatus = "PENDING_REVIEW";

type SportTicketInsert = {
  status: SportTicketStatus;
  currency: "USDT";
  matches: StoredMatchSelection[];
  total_quota: number;
  payin: number;
  possible_payout: number;
  is_played: false;
  played_successfully: null;
  message: string;
  reference_id: string;
};

type SportTicketInsertResult = {
  id: string | number;
};

type OpenAIResponsesPayload = {
  model: string;
  instructions: string;
  input: string;
  store: boolean;
  tools: { type: "web_search" }[];
  tool_choice: "auto";
};

type OpenAIResponseContent = {
  type?: string;
  text?: string;
};

type OpenAIResponseOutput = {
  type?: string;
  content?: OpenAIResponseContent[];
};

type OpenAIResponsesResponse = {
  output_text?: string;
  output?: OpenAIResponseOutput[];
};

type ErrorResponse = {
  message: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json<ErrorResponse>({ message }, { status });
}

function getMissingEnvVars() {
  return ["OPENAI_API_KEY", "CRON_SECRET"].filter((key) => !process.env[key]);
}

function isAllowedAnalysisSport(sportKey?: string): sportKey is AnalysisSport {
  return sportKey === "soccer" || sportKey === "basketball";
}

function isMatchSelection(value: unknown): value is MatchSelection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const selection = value as Partial<MatchSelection>;

  return (
    typeof selection.matchId === "number" &&
    Number.isInteger(selection.matchId) &&
    typeof selection.marketUrl === "string" &&
    typeof selection.outcome === "string" &&
    typeof selection.price === "number" &&
    Number.isFinite(selection.price) &&
    typeof selection.status === "string" &&
    typeof selection.minStake === "number" &&
    Number.isFinite(selection.minStake) &&
    typeof selection.maxStake === "number" &&
    Number.isFinite(selection.maxStake)
  );
}

function getMatchesFromBody(body: unknown): unknown {
  if (Array.isArray(body)) {
    return body;
  }

  if (body && typeof body === "object" && "matches" in body) {
    return (body as { matches?: unknown }).matches;
  }

  return undefined;
}

function getSelections(market: CloudbetMarket): CloudbetOddsSelection[] {
  if (market.selections?.length) {
    return market.selections;
  }

  return Object.values(market.submarkets ?? {}).flatMap((submarket) => submarket.selections ?? []);
}

function selectionToMatchSelection(
  match: CloudbetMatch,
  marketKey: string,
  selection: CloudbetOddsSelection,
): MatchSelection | null {
  if (!selection.marketUrl || selection.minStake === undefined || selection.maxStake === undefined) {
    return null;
  }

  return {
    matchId: match.id,
    marketUrl: selection.marketUrl,
    outcome: selection.outcome,
    price: selection.price,
    status: selection.status ?? "UNKNOWN",
    minStake: selection.minStake,
    maxStake: selection.maxStake,
    sportKey: match.sport?.key,
    matchName: match.name,
    competitionName: match.competition?.name,
    marketKey,
    params: selection.params,
    side: selection.side,
    probability: selection.probability,
    cutoffTime: match.cutoffTime,
  };
}

function extractMatchSelections(match: CloudbetMatch): MatchSelection[] {
  return Object.entries(match.markets ?? {}).flatMap(([marketKey, market]) =>
    getSelections(market)
      .map((selection) => selectionToMatchSelection(match, marketKey, selection))
      .filter((selection): selection is MatchSelection => selection !== null),
  );
}

async function loadCloudbetAnalysisSelections() {
  const matchesById = new Map<number, CloudbetMatch>();

  for (const sport of ANALYSIS_SPORTS) {
    const matches = await getAvailableMatches({ sport, limit: ANALYSIS_MATCH_LIMIT_PER_SPORT });

    matches.forEach((match) => {
      if (isAllowedAnalysisSport(match.sport?.key ?? sport)) {
        matchesById.set(match.id, match);
      }
    });
  }

  const detailedMatches = await Promise.allSettled(
    Array.from(matchesById.values()).map((match) =>
      getMatchById(String(match.id), { sport: match.sport?.key }).catch((error) => {
        console.warn("[cron:analyze-matches:cloudbet:match-detail:error]", { matchId: match.id, error });
        return match;
      }),
    ),
  );

  return detailedMatches.flatMap((settledMatch) =>
    settledMatch.status === "fulfilled" ? extractMatchSelections(settledMatch.value) : [],
  );
}

function filterEnabledSelections(selections: MatchSelection[]) {
  return selections.filter(
    (selection) =>
      selection.status === ENABLED_SELECTION_STATUS &&
      isAllowedAnalysisSport(selection.sportKey) &&
      selection.price > 0 &&
      selection.minStake > 0 &&
      selection.maxStake > 0,
  );
}

function mapToProposedBetBody(selection: MatchSelection): ProposedBetBody {
  return {
    currency: "USDT",
    eventId: selection.matchId.toString(),
    marketUrl: selection.marketUrl,
    outcome: selection.outcome,
    price: selection.price,
    referenceId: randomUUID(),
    stake: 1,
  };
}

function calculateTotalQuota(selections: MatchSelection[]) {
  if (selections.length === 0) {
    return 0;
  }

  return selections.reduce((totalQuota, selection) => totalQuota * selection.price, 1);
}

function buildStoredMatches(selections: MatchSelection[], proposedBetBodies: ProposedBetBody[]): StoredMatchSelection[] {
  return selections.map((selection, index) => ({
    ...selection,
    proposedBetBody: proposedBetBodies[index],
  }));
}

function buildSportTicketInsert(selections: MatchSelection[], proposedBetBodies: ProposedBetBody[]): SportTicketInsert {
  const payin = 1;
  const totalQuota = calculateTotalQuota(selections);

  return {
    status: "PENDING_REVIEW",
    currency: "USDT",
    matches: buildStoredMatches(selections, proposedBetBodies),
    total_quota: totalQuota,
    payin,
    possible_payout: totalQuota * payin,
    is_played: false,
    played_successfully: null,
    message: "Ticket generated by AI and awaiting review. Ticket is not played yet.",
    reference_id: randomUUID(),
  };
}

async function insertSportTicket(ticket: SportTicketInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sport_tickets")
    .insert(ticket)
    .select("id")
    .single<SportTicketInsertResult>();

  if (error) {
    console.error("[cron:analyze-matches:sport_tickets:insert:error]", error);
    throw new Error("Unable to persist generated sport ticket.");
  }

  if (!data) {
    console.error("[cron:analyze-matches:sport_tickets:insert:empty]");
    throw new Error("Unable to persist generated sport ticket.");
  }

  return data.id;
}

async function loadSportAnalystSkills() {
  const skillDirectory = path.join(process.cwd(), SPORT_ANALYST_SKILL_DIR);
  const entries = await readdir(skillDirectory, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const contents = await Promise.all(
    markdownFiles.map(async (fileName) => {
      const filePath = path.join(skillDirectory, fileName);
      const content = await readFile(filePath, "utf8");

      return `# ${fileName}\n\n${content.trim()}`;
    }),
  );

  return contents.join("\n\n---\n\n");
}

function buildAnalysisInput(selections: MatchSelection[]) {
  return [
    "Analyze these filtered soccer and basketball betting selections using the loaded sport analyst skills.",
    "Only evaluate selections whose sportKey is soccer or basketball and whose status is SELECTION_ENABLED.",
    "Consider form, H2H, injuries, suspensions, expected/confirmed lineups, motivation, schedule congestion, relevant news, market integrity concerns, and any reasons to avoid a bet.",
    "Create a pending proposal only. Do not claim a bet was placed. Do not recommend staking above the provided pending proposal stake.",
    "Return concise Markdown analysis with the strongest risks, supporting rationale, and review notes for the pending ticket.",
    "Selections JSON:",
    JSON.stringify(selections, null, 2),
  ].join("\n\n");
}

function extractOutputText(response: OpenAIResponsesResponse) {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const outputText = response.output
    ?.flatMap((output) => output.content ?? [])
    .filter((content) => content.type === "output_text" && typeof content.text === "string")
    .map((content) => content.text)
    .join("\n")
    .trim();

  return outputText || "No analysis text returned by OpenAI.";
}

async function createAnalysis(openaiApiKey: string, skillPrompt: string, selections: MatchSelection[]) {
  const payload: OpenAIResponsesPayload = {
    model: OPENAI_MODEL,
    instructions: skillPrompt,
    input: buildAnalysisInput(selections),
    store: false,
    tools: [{ type: "web_search" }],
    tool_choice: "auto",
  };

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${openaiApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = `OpenAI Responses API request failed with status ${response.status}.`;

    try {
      const errorBody = (await response.json()) as { error?: { message?: string } };
      message = errorBody.error?.message ?? message;
    } catch {
      // Keep the generic upstream error message.
    }

    throw new Error(message);
  }

  return extractOutputText((await response.json()) as OpenAIResponsesResponse);
}

export async function POST(request: Request) {
  const missingEnvVars = getMissingEnvVars();

  if (missingEnvVars.length > 0) {
    return jsonError("Cron analysis endpoint is not configured.", 500);
  }

  const cronSecret = process.env.CRON_SECRET as string;
  const openaiApiKey = process.env.OPENAI_API_KEY as string;

  if (request.headers.get("x-cron-secret") !== cronSecret) {
    return jsonError("Unauthorized cron request.", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON request body.", 400);
  }

  const matches = getMatchesFromBody(body);
  let candidateSelections: MatchSelection[];

  if (matches === undefined) {
    candidateSelections = await loadCloudbetAnalysisSelections();
  } else if (Array.isArray(matches) && matches.every(isMatchSelection)) {
    candidateSelections = matches;
  } else {
    return jsonError("Request body must include a matches array of MatchSelection objects or omit matches to fetch soccer and basketball selections.", 400);
  }

  const enabledSelections = filterEnabledSelections(candidateSelections);
  const skippedSelectionsCount = candidateSelections.length - enabledSelections.length;

  if (enabledSelections.length === 0) {
    return jsonError("No soccer or basketball selections with SELECTION_ENABLED status were available for analysis.", 400);
  }

  try {
    const skillPrompt = await loadSportAnalystSkills();
    const analysis = await createAnalysis(openaiApiKey, skillPrompt, enabledSelections);
    const proposedBetBodies = enabledSelections.map(mapToProposedBetBody);
    const sportTicketInsert = buildSportTicketInsert(enabledSelections, proposedBetBodies);
    const ticketId = await insertSportTicket(sportTicketInsert);

    const pendingTicket = {
      status: "PENDING_REVIEW" as const,
      createdAt: new Date().toISOString(),
      analysis,
      selections: sportTicketInsert.matches,
      proposedBetBodies,
      totalQuota: sportTicketInsert.total_quota,
      payin: sportTicketInsert.payin,
      possiblePayout: sportTicketInsert.possible_payout,
      referenceId: sportTicketInsert.reference_id,
      message: sportTicketInsert.message,
      isPlayed: sportTicketInsert.is_played,
      playedSuccessfully: sportTicketInsert.played_successfully,
    };

    return NextResponse.json({
      success: true,
      ticketId,
      analyzedSelectionsCount: enabledSelections.length,
      skippedSelectionsCount,
      pendingTicket,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze matches.";

    return jsonError(message, 500);
  }
}
