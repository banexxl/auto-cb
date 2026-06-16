import type { TicketSelection, TicketSummary } from "@/lib/ticket-types";

export const ticketStorageKey = "auto-cb-ticket";

export function calculateTicketSummary(selections: TicketSelection[]): TicketSummary {
  return {
    selectionsCount: selections.length,
    totalOdds: selections.reduce((total, selection) => total * selection.price, selections.length > 0 ? 1 : 0),
  };
}

export function getTicketSelectionKey(selection: Pick<TicketSelection, "eventId" | "marketUrl">) {
  return `${selection.eventId}:${selection.marketUrl}`;
}

export function dedupeTicketSelections(selections: TicketSelection[]) {
  const selectionMap = new Map<string, TicketSelection>();

  selections.forEach((selection) => {
    selectionMap.set(getTicketSelectionKey(selection), selection);
  });

  return Array.from(selectionMap.values());
}
