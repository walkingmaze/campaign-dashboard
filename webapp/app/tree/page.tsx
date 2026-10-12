import { createClient } from '@supabase/supabase-js';
import TreeView from './TreeView';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function TreePage() {
  // For now: just grab the first campaign. Once you have more than one,
  // this becomes a dropdown/selector passing an id here instead.
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
    .order('change_date', { ascending: true });
  
  const { data: snaps } = await supabase
    .from('insight_snapshots')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('snapshot_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);

  const latest = snaps?.[0];
  const rawValue = latest ? latest[campaign.kpi_metric] : null;
  const liveValue = rawValue != null ? Number(rawValue) : null;

  return (
    <TreeView
      campaignName={campaign.name}
      kpiMetric={campaign.kpi_metric}
      kpiTarget={campaign.kpi_target}
      changes={changes ?? []}
      liveValue={liveValue}
      snapshotDate={latest?.snapshot_date ?? null}
    />
  );
}