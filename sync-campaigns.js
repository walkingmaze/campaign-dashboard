const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const metaToken = process.env.META_ACCESS_TOKEN;
const apiVersion = 'v21.0';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // 1. Get your ad account
  const accountsRes = await axios.get(
    `https://graph.facebook.com/${apiVersion}/me/adaccounts`,
    { params: { access_token: metaToken, fields: 'id,name' } }
  );
  const adAccountId = accountsRes.data.data[0].id;

  // 2. Get campaigns in that account
  const campaignsRes = await axios.get(
    `https://graph.facebook.com/${apiVersion}/${adAccountId}/campaigns`,
    { params: { access_token: metaToken, fields: 'id,name,status' } }
  );

  for (const c of campaignsRes.data.data) {
    // 3. Check if this campaign already exists in Supabase
    const { data: existing } = await supabase
      .from('campaigns')
      .select('id')
      .eq('meta_campaign_id', c.id)
      .maybeSingle();

    let campaignRowId;

    if (existing) {
      campaignRowId = existing.id;
      console.log(`Campaign already exists: ${c.name}`);
    } else {
      // Insert new campaign with placeholder KPI values —
      // update kpi_metric/kpi_target manually in Supabase's Table Editor afterward
      const { data: inserted, error } = await supabase
        .from('campaigns')
        .insert({
          meta_campaign_id: c.id,
          name: c.name,
          kpi_metric: 'ctr',
          kpi_target: 1.8,
        })
        .select('id')
        .single();

      if (error) throw error;
      campaignRowId = inserted.id;
      console.log(`Inserted new campaign: ${c.name}`);
    }

    // 4. Pull insights for this campaign
    const insightsRes = await axios.get(
      `https://graph.facebook.com/${apiVersion}/${c.id}/insights`,
      { params: { access_token: metaToken, fields: 'spend,cpm,clicks,impressions' } }
    );

    const insight = insightsRes.data.data[0];
    if (insight) {
      const { error: snapErr } = await supabase.from('insight_snapshots').insert({
        campaign_id: campaignRowId,
        snapshot_date: new Date().toISOString().slice(0, 10),
        spend: insight.spend,
        cpm: insight.cpm,
        clicks: insight.clicks,
        impressions: insight.impressions,
      });
      if (snapErr) throw snapErr;
      console.log(`Snapshot saved for: ${c.name}`);
    } else {
      console.log(`No insights yet for: ${c.name}`);
    }
  }
}

main().catch((err) => console.error('Error:', err.message || err));