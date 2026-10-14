export type RangeId =
  | 'today' | 'yesterday' | 'last7' | 'last30'
  | 'thisMonth' | 'lastMonth' | 'maximum' | 'custom';

export const PRESETS: { id: RangeId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'maximum', label: 'Maximum' },
];

export type ResolvedRange = { id: RangeId; label: string; text: string; from: string; to: string };
export type Totals = { spend: number; impressions: number; clicks: number; cpm: number | null };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function resolveRange(id?: string, from?: string, to?: string): ResolvedRange {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const today = utc(y, m, d);
  const yesterday = utc(y, m, d - 1);

  let rangeId: RangeId = PRESETS.some((p) => p.id === id) || id === 'custom' ? (id as RangeId) : 'maximum';
  let start: Date;
  let end: Date;

  switch (rangeId) {
    case 'today': start = today; end = today; break;
    case 'yesterday': start = yesterday; end = yesterday; break;
    case 'last7': start = utc(y, m, d - 7); end = yesterday; break;
    case 'last30': start = utc(y, m, d - 30); end = yesterday; break;
    case 'thisMonth': start = utc(y, m, 1); end = today; break;
    case 'lastMonth': start = utc(y, m - 1, 1); end = utc(y, m, 0); break;
    case 'custom':
      if (from && to && DAY.test(from) && DAY.test(to)) {
        start = new Date(from);
        end = new Date(to);
        if (start > end) [start, end] = [end, start];
      } else {
        rangeId = 'maximum';
        start = utc(2000, 0, 1);
        end = today;
      }
      break;
    default: start = utc(2000, 0, 1); end = today;
  }

  const label = rangeId === 'custom' ? 'Custom' : PRESETS.find((p) => p.id === rangeId)!.label;
  const text =
    rangeId === 'maximum' ? 'all available data' : start.getTime() === end.getTime() ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;

  return { id: rangeId, label, text, from: iso(start), to: iso(end) };
}

export function sumRows(rows: { spend: unknown; impressions: unknown; clicks: unknown }[]): Totals | null {
  if (!rows.length) return null;
  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  for (const r of rows) {
    spend += Number(r.spend) || 0;
    impressions += Number(r.impressions) || 0;
    clicks += Number(r.clicks) || 0;
  }
  return { spend, impressions, clicks, cpm: impressions > 0 ? (spend / impressions) * 1000 : null };
}

export function kpiFromTotals(metric: string, t: Totals | null): number | null {
  if (!t) return null;
  switch (metric.toLowerCase()) {
    case 'cpm': return t.cpm;
    case 'cpc': return t.clicks > 0 ? t.spend / t.clicks : null;
    case 'ctr': return t.impressions > 0 ? (t.clicks / t.impressions) * 100 : null;
    default: return null;
  }
}