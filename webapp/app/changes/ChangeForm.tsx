'use client';

import { useState } from 'react';
import { logChange } from './actions';

type Campaign = { id: string; name: string };

const CHANGE_TYPES = [
  'budget_increased',
  'budget_decreased',
  'audience_broadened',
  'audience_narrowed',
  'ad_activated',
  'ad_deactivated',
  'creative_added',
  'other',
];

export default function ChangeForm({ campaigns }: { campaigns: Campaign[] }) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action={async (formData) => {
        setSubmitting(true);
        await logChange(formData);
        setSubmitting(false);
        (document.getElementById('change-form') as HTMLFormElement)?.reset();
      }}
      id="change-form"
      style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}
    >
      <label>
        Campaign
        <select name="campaign_id" required style={{ width: '100%', padding: 8 }}>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label>
        Date
        <input type="date" name="change_date" required style={{ width: '100%', padding: 8 }} />
      </label>

      <label>
        Change type
        <select name="change_type" required style={{ width: '100%', padding: 8 }}>
          {CHANGE_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
      </label>

      <label>
        Comment
        <textarea name="comment" rows={3} style={{ width: '100%', padding: 8 }} />
      </label>

      <label>
        Metric before (optional)
        <input type="number" step="0.01" name="metric_before" style={{ width: '100%', padding: 8 }} />
      </label>

      <label>
        Metric after (optional)
        <input type="number" step="0.01" name="metric_after" style={{ width: '100%', padding: 8 }} />
      </label>

      <button type="submit" disabled={submitting} style={{ padding: 10 }}>
        {submitting ? 'Saving...' : 'Log this change'}
      </button>
    </form>
  );
}