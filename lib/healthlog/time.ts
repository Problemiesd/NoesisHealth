export function dateKeyForTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function formatShortDateTime(dateIso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dateIso));
}

export function createIsoNow(): string {
  return new Date().toISOString();
}

export function parseClockRangeMinutes(rawText: string): number | null {
  const match = rawText.match(
    /(\d{1,2}):(\d{2})\s*[-–—toถึง]+\s*(\d{1,2}):(\d{2})/i
  );
  if (!match) {
    return null;
  }

  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = Number(match[3]) * 60 + Number(match[4]);
  const minutes = end >= start ? end - start : end + 24 * 60 - start;
  return minutes;
}
