import { createClient } from '@supabase/supabase-js';
import TreeView from './TreeView';
import { resolveRange, sumRows, kpiFromTotals } from './dateRange';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function TreePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const range = resolveRange(params.range, params.from, params.to);

  // For now: just grab the first campaign.
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, kpi_metric, kpi_target')
    .limit(1);

  const campaign = campaigns?.[0];

  if (!campaign) {
    return <div style={{ padding: 20 }}>No campaigns yet — run sync-campaigns.js first.</div>;
  }

  const { data: changes } = await supabase
    .from('changes')
    .select('id, change_date, change_type, comment, metric_before, metric_after')
    .eq('campaign_id', campaign.id)
    .gte('change_date', range.from)
    .lte('change_date', range.to)
    .order('change_date', { ascending: true });

  const { data: snaps } = await supabase
    .from('insight_snapshots')
    .select('spend, impressions, clicks')
    .eq('campaign_id', campaign.id)
    .gte('snapshot_date', range.from)
    .lte('snapshot_date', range.to);

  const totals = sumRows(snaps ?? []);
  const liveValue = kpiFromTotals(campaign.kpi_metric, totals);

  return (
    <TreeView
      campaignName={campaign.name}
      campaignId={campaign.id}
      kpiMetric={campaign.kpi_metric}
      kpiTarget={campaign.kpi_target}
      changes={changes ?? []}
      liveValue={liveValue}
      range={range}
      totals={totals}
    />
  );
}