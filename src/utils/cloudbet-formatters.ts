const SPORT_PREFIX_PATTERN = /^\w+\./;
const WORD_SEPARATOR_PATTERN = /[_-]+/g;

function titleCaseWords(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatCloudbetKey(value: string) {
  return titleCaseWords(value.replace(SPORT_PREFIX_PATTERN, "").replace(WORD_SEPARATOR_PATTERN, " "));
}

export function formatCloudbetMarketKey(value: string) {
  return formatCloudbetKey(value);
}

export function formatCloudbetOutcome(value: string) {
  const knownOutcomes: Record<string, string> = {
    away: "Away",
    draw: "Draw",
    home: "Home",
    no: "No",
    over: "Over",
    under: "Under",
    yes: "Yes",
  };

  return knownOutcomes[value] ?? formatCloudbetKey(value);
}

export function formatCloudbetParam(value: string) {
  const [rawKey, rawValue] = value.split("=");

  if (!rawKey || rawValue === undefined) {
    return formatCloudbetKey(value);
  }

  return `${formatCloudbetKey(rawKey)} ${rawValue}`;
}
