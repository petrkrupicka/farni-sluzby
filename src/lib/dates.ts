import { WEEKDAYS } from "./labels";

export function parseIso(value: string) {
  return new Date(value);
}

export function toIso(date: Date) {
  return date.toISOString();
}

export function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateAndTime(dateStr: string, time: string) {
  const [h, min] = time.split(":").map(Number);
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(h, min, 0, 0);
  return d;
}

export function formatDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("cs-CZ", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatTime(value: string | Date) {
  if (typeof value === "string" && /^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDateTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${formatDate(d)} · ${formatTime(d)}`;
}

export function hoursUntil(startsAt: string) {
  return (new Date(startsAt).getTime() - Date.now()) / 36e5;
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

export function eachDateInRange(startsOn: string, endsOn: string, weekday: number) {
  const dates: Date[] = [];
  const cur = new Date(`${startsOn}T00:00:00`);
  const end = new Date(`${endsOn}T00:00:00`);
  while (cur <= end) {
    if (cur.getDay() === weekday) dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function weekdayName(day: number) {
  return WEEKDAYS[day] ?? "";
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, n: number) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

export function startOfWeek(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - mondayOffset);
  return d;
}

export function addWeeks(date: Date, n: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n * 7);
}

export function weekLabel(date: Date) {
  const start = startOfWeek(date);
  const end = addWeeks(start, 1);
  end.setDate(end.getDate() - 1);
  const fmt = (value: Date) =>
    new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "short" }).format(value);
  return `${fmt(start)} – ${fmt(end)}`;
}

export function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("cs-CZ", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function nextDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

/** Od následujícího dne; do = stejný kalendářní den v dalším měsíci minus jeden den. */
export function nextPlanningWindow(after: Date) {
  const starts = nextDay(after);
  const ends = new Date(starts.getFullYear(), starts.getMonth() + 1, starts.getDate() - 1);
  return { startsOn: toDateInput(starts), endsOn: toDateInput(ends) };
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
