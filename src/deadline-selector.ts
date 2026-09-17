export type DeadlineItem<TEvent = unknown, TMaterial = unknown, TPreparation = unknown> = {
  id: string;
  key: string;
  kind: "event" | "material" | "preparation";
  companyId?: string;
  type: string;
  title: string;
  at: string;
  event?: TEvent;
  material?: TMaterial;
  preparation?: TPreparation;
};

type EventSource = { id: string; companyId?: string; type: string; title: string; startsAt: string; deletedAt?: boolean };
type MaterialSource = { id: string; companyId?: string; type: string; title: string; dueAt?: string; completed: boolean };
type PreparationSource = { id: string; companyId?: string; type: string; title: string; dueAt?: string; completed: boolean };
type DeadlineSource<TEvent extends EventSource, TMaterial extends MaterialSource, TPreparation extends PreparationSource> = {
  events: TEvent[];
  materials: TMaterial[];
  preparations: TPreparation[];
};

function tokyoParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])) as { year: string; month: string; day: string; hour: string; minute: string };
}

export function parseTokyoCalendarDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/);
  const parts = match
    ? { year: match[1], month: match[2], day: match[3], hour: match[4], minute: match[5] }
    : tokyoParts(new Date(value));
  return new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00+09:00`);
}

function tokyoDateKey(value: string | number | Date) {
  const { year, month, day } = tokyoParts(new Date(value));
  return `${year}-${month}-${day}`;
}

function addTokyoDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
}

export function getUpcomingDeadlines<TEvent extends EventSource, TMaterial extends MaterialSource, TPreparation extends PreparationSource>(data: DeadlineSource<TEvent, TMaterial, TPreparation>, now = Date.now()): DeadlineItem<TEvent, TMaterial, TPreparation>[] {
  const future = (at: string) => {
    const time = parseTokyoCalendarDate(at).getTime();
    return Number.isFinite(time) && time >= now;
  };
  return [
    ...data.events.filter((item) => !item.deletedAt && future(item.startsAt)).map((item) => ({ id: item.id, key: `event:${item.id}`, kind: "event" as const, companyId: item.companyId, type: item.type, title: item.title, at: item.startsAt, event: item })),
    ...data.materials.filter((item) => !item.completed && !!item.dueAt && future(item.dueAt!)).map((item) => ({ id: item.id, key: `material:${item.id}`, kind: "material" as const, companyId: item.companyId, type: item.type, title: item.title, at: item.dueAt!, material: item })),
    ...data.preparations.filter((item) => !item.completed && !!item.dueAt && future(item.dueAt!)).map((item) => ({ id: item.id, key: `preparation:${item.id}`, kind: "preparation" as const, companyId: item.companyId, type: item.type, title: item.title, at: item.dueAt!, preparation: item })),
  ].sort((a, b) => parseTokyoCalendarDate(a.at).getTime() - parseTokyoCalendarDate(b.at).getTime());
}

export function selectWeeklyDeadlines<TEvent extends EventSource, TMaterial extends MaterialSource, TPreparation extends PreparationSource>(data: DeadlineSource<TEvent, TMaterial, TPreparation>, now = Date.now()) {
  const today = tokyoDateKey(now);
  const weekday = new Date(`${today}T12:00:00+09:00`).getDay();
  const weekStart = addTokyoDays(today, weekday === 0 ? -6 : 1 - weekday);
  const weekEnd = addTokyoDays(weekStart, 6);
  return getUpcomingDeadlines(data, now).filter((item) => {
    const date = tokyoDateKey(parseTokyoCalendarDate(item.at));
    return date >= weekStart && date <= weekEnd;
  });
}
