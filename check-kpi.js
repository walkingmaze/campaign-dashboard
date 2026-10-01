const { createClient } = require('@supabase/supabase-js');

const LOWER_IS_BETTER = ['cpm', 'cpc', 'cpa'];

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO;

async function sendAlertEmail(campaign, value) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: ALERT_EMAIL_TO,
      subject: `⚠️ ${campaign.name} is below ${campaign.kpi_metric.toUpperCase()} target`,
      html: `<p><strong>Metric:</strong> ${campaign.kpi_metric.toUpperCase()}</p>
             <p><strong>Target:</strong> ${campaign.kpi_target}€</p>
             <p><strong>Current:</strong> ${value}€</p>
             <p>Logged automatically by the daily sync.</p>`,
    }),
  });
  if (!res.ok) throw new Error(`Resend API error ${res.status}: ${await res.text()}`);
  console.log(`Sent alert email for ${campaign.name}`);
}

async function main() {
  const { data: campaigns, error } = await supabase.from('campaigns').select('*');
  if (error) throw error;

  for (const campaign of campaigns) {
    const { data: snapshots, error: snapErr } = await supabase
      .from('insight_snapshots')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('snapshot_date', { ascending: false })
      .limit(1);
    if (snapErr) throw snapErr;
    if (!snapshots.length) continue;

    const value = snapshots[0][campaign.kpi_metric];
    if (value == null) continue;

    const lowerBetter = LOWER_IS_BETTER.includes(campaign.kpi_metric.toLowerCase());
    const isBelowTarget = lowerBetter ? value > campaign.kpi_target : value < campaign.kpi_target;

    if (isBelowTarget) {
      if (campaign.kpi_alert_sent) {
        console.log(`Already alerted for ${campaign.name}, skipping`);
      } else {
        await sendAlertEmail(campaign, value);
        await supabase.from('campaigns').update({ kpi_alert_sent: true }).eq('id', campaign.id);
      }
    } else if (campaign.kpi_alert_sent) {
      // back above target — re-arm for next time it dips
      await supabase.from('campaigns').update({ kpi_alert_sent: false }).eq('id', campaign.id);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});