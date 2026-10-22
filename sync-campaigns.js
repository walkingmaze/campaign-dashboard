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
      await supabase.from('campaigns').update({ name: c.name }).eq('id', existing.id);
      console.log(`Campaign already exists: ${c.name}`);
       } else {
      // Insert new campaign with default KPI values —
      // change kpi_metric/kpi_target afterward on the plant page
      const { data: inserted, error } = await supabase
        .from('campaigns')
        .insert({
          meta_campaign_id: c.id,
          name: c.name,
          kpi_metric: 'cpm',
          kpi_target: 1,
        })
        .select('id')
        .single();

      if (error) throw error;
      campaignRowId = inserted.id;
      console.log(`Inserted new campaign: ${c.name}`);
    }

       // 4. Pull daily insights (one row per day) for this campaign
    const insightsRes = await axios.get(
      `https://graph.facebook.com/${apiVersion}/${c.id}/insights`,
      {
        params: {
          access_token: metaToken,
          fields: 'spend,cpm,clicks,impressions',
          date_preset: 'maximum',
          time_increment: 1,
          limit: 500,
        },
      }
    );

    const rows = insightsRes.data.data.map((d) => ({
      campaign_id: campaignRowId,
      snapshot_date: d.date_start,
      spend: d.spend,
      cpm: d.cpm,
      clicks: d.clicks,
      impressions: d.impressions,
    }));

    if (rows.length) {
      const { error: snapErr } = await supabase
        .from('insight_snapshots')
        .upsert(rows, { onConflict: 'campaign_id,snapshot_date' });
      if (snapErr) throw snapErr;
      console.log(`${rows.length} daily rows saved for: ${c.name}`);
    } else {
      console.log(`No insights yet for: ${c.name}`);
    }
  }
}

main().catch((err) => {
  console.error('Error:', err.response?.data?.error?.message || err.message || err);
  process.exit(1);
});