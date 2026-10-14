'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const KPI_METRICS = ['cpc', 'cpm', 'cpv', 'cpa'] as const;

export async function updateCampaignKpi(
  campaignId: string,
  metric: string,
  target: number
) {
  if (!campaignId || !(KPI_METRICS as readonly string[]).includes(metric)) {
    throw new Error('Choose a valid KPI metric.');
  }

  if (!Number.isFinite(target) || target < 0) {
    throw new Error('Target must be a non-negative number.');
  }

  const { data, error } = await supabase
    .from('campaigns')
    .update({ kpi_metric: metric, kpi_target: target })
    .eq('id', campaignId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(`Could not save the KPI settings: ${error.message}`);
  }
  if (!data) {
    throw new Error('Campaign not found. The KPI settings were not saved.');
  }

  revalidatePath('/tree');
  revalidatePath('/campaigns');
}
