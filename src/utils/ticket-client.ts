"use client";

import type { TicketSelection } from "@/lib/ticket-types";
import { dedupeTicketSelections, ticketStorageKey } from "@/utils/ticket";

export function readTicketSelections() {
  if (typeof window === "undefined") {
    return [];
  }

  const storedTicket = window.localStorage.getItem(ticketStorageKey);

  if (!storedTicket) {
    return [];
  }

  try {
    const parsedTicket = JSON.parse(storedTicket) as unknown;

    if (!Array.isArray(parsedTicket)) {
      return [];
    }

    return parsedTicket.filter(isTicketSelection);
  } catch {
    return [];
  }
}

export function writeTicketSelections(selections: TicketSelection[]) {
  window.localStorage.setItem(ticketStorageKey, JSON.stringify(dedupeTicketSelections(selections)));
  window.dispatchEvent(new Event("auto-cb-ticket-updated"));
}

export function addTicketSelection(selection: TicketSelection) {
  const selections = readTicketSelections();
  writeTicketSelections([...selections, selection]);
}

export function removeTicketSelection(selectionId: string) {
  const selections = readTicketSelections().filter((selection) => selection.id !== selectionId);
  writeTicketSelections(selections);
}

export function clearTicketSelections() {
  writeTicketSelections([]);
}

function isTicketSelection(value: unknown): value is TicketSelection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const selection = value as Partial<TicketSelection>;

  return (
    typeof selection.id === "string" &&
    typeof selection.eventId === "string" &&
    typeof selection.eventName === "string" &&
    typeof selection.sportKey === "string" &&
    typeof selection.marketKey === "string" &&
    typeof selection.marketName === "string" &&
    typeof selection.marketUrl === "string" &&
    typeof selection.outcome === "string" &&
    typeof selection.price === "number" &&
    typeof selection.addedAt === "string"
  );
}
