import { createClient } from '@supabase/supabase-js';

// Server Component: this code runs only on the server, never sent to the browser.
// That's why it's safe to use the secret key here directly.
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function CampaignsPage() {
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('id, name, kpi_metric, kpi_target');

  if (error) {
    return <div style={{ padding: 20, color: 'red' }}>Error: {error.message}</div>;
  }

  // For each campaign, grab its most recent snapshot
  const campaignsWithSnapshots = await Promise.all(
    (campaigns ?? []).map(async (c) => {
      const { data: snapshots } = await supabase
        .from('insight_snapshots')
        .select('snapshot_date, spend, cpm, clicks, impressions')
        .eq('campaign_id', c.id)
        .order('snapshot_date', { ascending: false })
        .limit(1);
      return { ...c, latest: snapshots?.[0] ?? null };
    })
  );

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Campaigns (raw data check)</h1>
      <table style={{ borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Name</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>KPI target</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Latest date</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Spend</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>CPM</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Clicks</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Impressions</th>
          </tr>
        </thead>
        <tbody>
          {campaignsWithSnapshots.map((c) => (
            <tr key={c.id}>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{c.name}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{c.kpi_metric}: {c.kpi_target}€</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{c.latest?.snapshot_date ?? '—'}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{c.latest?.spend ?? '—'}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{c.latest?.cpm ?? '—'}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{c.latest?.clicks ?? '—'}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{c.latest?.impressions ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}