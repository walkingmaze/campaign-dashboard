'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function logChange(formData: FormData) {
  const campaign_id = formData.get('campaign_id') as string;
  const change_date = formData.get('change_date') as string;
  const change_type = formData.get('change_type') as string;
  const comment = formData.get('comment') as string;
  const metric_before = formData.get('metric_before') as string;
  const metric_after = formData.get('metric_after') as string;

  const { error } = await supabase.from('changes').insert({
    campaign_id,
    change_date,
    change_type,
    comment,
    metric_before: metric_before ? parseFloat(metric_before) : null,
    metric_after: metric_after ? parseFloat(metric_after) : null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/changes');
}