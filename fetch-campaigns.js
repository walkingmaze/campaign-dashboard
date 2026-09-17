const axios = require('axios');

const token = process.env.META_ACCESS_TOKEN;
const apiVersion = 'v21.0'; // check developers.facebook.com for the current version if this errors

async function main() {
  try {
    // Step 1: confirm the token works and list your ad account(s)
    const accountsRes = await axios.get(
      `https://graph.facebook.com/${apiVersion}/me/adaccounts`,
      { params: { access_token: token, fields: 'id,name,account_status' } }
    );
    console.log('Ad accounts:', JSON.stringify(accountsRes.data, null, 2));

    const adAccountId = accountsRes.data.data[0].id; // e.g. "act_123456789"

    // Step 2: list campaigns in that account
    const campaignsRes = await axios.get(
      `https://graph.facebook.com/${apiVersion}/${adAccountId}/campaigns`,
      { params: { access_token: token, fields: 'id,name,status,objective' } }
    );
    console.log('Campaigns:', JSON.stringify(campaignsRes.data, null, 2));

    // Step 3: pull insights (spend, CPM, results) for the first campaign, if one exists
    if (campaignsRes.data.data.length > 0) {
      const campaignId = campaignsRes.data.data[0].id;
      const insightsRes = await axios.get(
        `https://graph.facebook.com/${apiVersion}/${campaignId}/insights`,
        { params: { access_token: token, fields: 'spend,cpm,clicks,impressions' } }
      );
      console.log('Insights:', JSON.stringify(insightsRes.data, null, 2));
    } else {
      console.log('No campaigns found yet on this ad account.');
    }
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

main();