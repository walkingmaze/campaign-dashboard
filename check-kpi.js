const { createClient } = require('@supabase/supabase-js');

const LOWER_IS_BETTER = ['cpm', 'cpc', 'cpa'];
const WINDOW_DAYS = 3;
const MIN_IMPRESSIONS = 1000;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO;

function isoDaysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// KPI over a period = totals first, then the ratio (same as Ads Manager)
function kpiFromRows(metric, rows) {
  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  for (const r of rows) {
    spend += Number(r.spend) || 0;
    impressions += Number(r.impressions) || 0;
    clicks += Number(r.clicks) || 0;
  }
  if (impressions < MIN_IMPRESSIONS) return null;

  switch (metric.toLowerCase()) {
    case 'cpm': return (spend / impressions) * 1000;
    case 'cpc': return clicks > 0 ? spend / clicks : null;
    case 'ctr': return (clicks / impressions) * 100;
    default: return null;
  }
}

async function sendAlertEmail(campaign, value, from, to) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: ALERT_EMAIL_TO,
      subject: `⚠️ ${campaign.name} is worse than ${campaign.kpi_metric.toUpperCase()} target`,
      html: `<p><strong>Metric:</strong> ${campaign.kpi_metric.toUpperCase()}</p>
             <p><strong>Target:</strong> ${campaign.kpi_target}€</p>
             <p><strong>Last ${WINDOW_DAYS} days (${from} to ${to}):</strong> ${value.toFixed(2)}€</p>
             <p>Logged automatically by the daily sync.</p>`,
    }),
  });
  if (!res.ok) throw new Error(`Resend API error ${res.status}: ${await res.text()}`);
  console.log(`Sent alert email for ${campaign.name}`);
}

async function main() {
  const from = isoDaysAgo(WINDOW_DAYS);
  const to = isoDaysAgo(1);

  const { data: campaigns, error } = await supabase.from('campaigns').select('*');
  if (error) throw error;

  for (const campaign of campaigns) {
    const { data: rows, error: rowsErr } = await supabase
      .from('insight_snapshots')
      .select('spend, impressions, clicks')
      .eq('campaign_id', campaign.id)
      .gte('snapshot_date', from)
      .lte('snapshot_date', to);
    if (rowsErr) throw rowsErr;

    const value = kpiFromRows(campaign.kpi_metric, rows ?? []);
    if (value == null) {
      console.log(`Not enough data in the last ${WINDOW_DAYS} days for ${campaign.name}, skipping`);
      continue;
    }

    const lowerBetter = LOWER_IS_BETTER.includes(campaign.kpi_metric.toLowerCase());
    const isWorse = lowerBetter ? value > campaign.kpi_target : value < campaign.kpi_target;

    if (isWorse) {
      if (campaign.kpi_alert_sent) {
        console.log(`Already alerted for ${campaign.name}, skipping`);
      } else {
        await sendAlertEmail(campaign, value, from, to);
        await supabase.from('campaigns').update({ kpi_alert_sent: true }).eq('id', campaign.id);
      }
    } else if (campaign.kpi_alert_sent) {
      // back on target, re-arm for the next dip
      await supabase.from('campaigns').update({ kpi_alert_sent: false }).eq('id', campaign.id);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});