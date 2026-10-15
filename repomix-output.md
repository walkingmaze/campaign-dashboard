This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
````
.github/
  workflows/
    sync-campaigns.yml
webapp/
  app/
    campaigns/
      page.tsx
    changes/
      actions.ts
      ChangeForm.tsx
      page.tsx
    tree/
      actions.ts
      dateRange.ts
      DateRangePicker.tsx
      KpiControls.tsx
      page.tsx
      TreeView.tsx
    favicon.ico
    globals.css
    layout.tsx
    page.tsx
  public/
    file.svg
    globe.svg
    next.svg
    vercel.svg
    window.svg
  tests/
    smoke.spec.ts
  .gitignore
  AGENTS.md
  CLAUDE.md
  eslint.config.mjs
  next.config.ts
  package.json
  playwright.config.ts
  postcss.config.mjs
  README.md
  tsconfig.json
.gitignore
check-kpi.js
fetch-campaigns.js
package.json
README.md
sync-campaigns.js
````

# Files

## File: webapp/app/campaigns/page.tsx
````typescript
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
````

## File: webapp/app/changes/actions.ts
````typescript
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
````

## File: webapp/app/changes/ChangeForm.tsx
````typescript
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
````

## File: webapp/app/changes/page.tsx
````typescript
import { createClient } from '@supabase/supabase-js';
import ChangeForm from './ChangeForm';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function ChangesPage() {
  const { data: campaigns } = await supabase.from('campaigns').select('id, name');

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Log a change</h1>
      <ChangeForm campaigns={campaigns ?? []} />
    </div>
  );
}
````

## File: webapp/app/tree/actions.ts
````typescript
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
````

## File: webapp/app/tree/DateRangePicker.tsx
````typescript
'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PRESETS } from './dateRange';
import type { ResolvedRange } from './dateRange';

export default function DateRangePicker({ range }: { range: ResolvedRange }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(range.id === 'custom' ? range.from : '');
  const [customTo, setCustomTo] = useState(range.id === 'custom' ? range.to : '');

  function choose(id: string) {
    setOpen(false);
    router.push(`${pathname}?range=${id}`);
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    setOpen(false);
    router.push(`${pathname}?range=custom&from=${customFrom}&to=${customTo}`);
  }

  const inputStyle = {
    background: '#0e1f1a',
    color: '#F3EFE6',
    border: '1px solid #29453a',
    borderRadius: 8,
    padding: '6px 8px',
    colorScheme: 'dark' as const,
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label={`Date range: ${range.label}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, background: 'rgba(32, 55, 47, 0.9)', border: '1px solid #29453a', color: '#F3EFE6', fontSize: 13, cursor: 'pointer' }}
      >
        <span>{range.label}</span>
        <span style={{ opacity: 0.7 }}>{range.text}</span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 11, width: 270, padding: 12, borderRadius: 14, background: '#122a23', border: '1px solid #29453a', boxShadow: '0 18px 40px rgba(6, 12, 10, 0.45)', display: 'grid', gap: 4 }}>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => choose(p.id)}
                style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, background: p.id === range.id ? 'rgba(150, 196, 154, 0.16)' : 'transparent', color: p.id === range.id ? '#96C49A' : '#F3EFE6' }}
              >
                {p.label}
              </button>
            ))}
            <div style={{ borderTop: '1px solid #29453a', marginTop: 6, paddingTop: 10, display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, color: '#9bb0a5' }}>Custom range</div>
              <input type="date" aria-label="Start date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={inputStyle} />
              <input type="date" aria-label="End date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={inputStyle} />
              <button
                type="button"
                onClick={applyCustom}
                disabled={!customFrom || !customTo}
                style={{ padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: '#96C49A', color: '#0b1c17', opacity: !customFrom || !customTo ? 0.5 : 1 }}
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
````

## File: webapp/app/tree/KpiControls.tsx
````typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateCampaignKpi } from './actions';

const KPI_METRICS = ['cpc', 'cpm', 'cpv', 'cpa'] as const;

export default function KpiControls({
  campaignId,
  initialMetric,
  initialTarget,
}: {
  campaignId: string;
  initialMetric: string;
  initialTarget: number;
}) {
  const router = useRouter();
  const [metric, setMetric] = useState(initialMetric.toLowerCase());
  const [target, setTarget] = useState(String(initialTarget));
  const [savedTarget, setSavedTarget] = useState(String(initialTarget));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save(nextMetric: string, targetValue: string): Promise<boolean> {
    if (!targetValue.trim()) {
      setError('Enter a valid target of zero or more euros.');
      setMessage('');
      return false;
    }
    const numericTarget = Number(targetValue);
    if (!Number.isFinite(numericTarget) || numericTarget < 0) {
      setError('Enter a valid target of zero or more euros.');
      setMessage('');
      return false;
    }

    setSaving(true);
    setError('');
    setMessage('Saving KPI settings…');
    try {
      await updateCampaignKpi(campaignId, nextMetric, numericTarget);
      setSavedTarget(targetValue);
      setMessage('KPI settings saved.');
      router.refresh();
      return true;
    } catch (saveError) {
      setMessage('');
      setError(saveError instanceof Error ? saveError.message : 'Could not save KPI settings.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  function handleTargetBlur() {
    if (target !== savedTarget) void save(metric, target);
  }

  return (
    <div className="tree-kpi-controls" aria-label="Campaign KPI settings">
      <label className="tree-kpi-pill tree-kpi-pill--metric">
        <span className="tree-kpi-pill-label">KPI</span>
        <select
          aria-label="KPI metric"
          disabled={saving}
          value={metric}
          onChange={(event) => {
            const nextMetric = event.target.value;
            const previousMetric = metric;
            setMetric(nextMetric);
            void save(nextMetric, target).then((saved) => {
              if (!saved) setMetric(previousMetric);
            });
          }}
        >
          {KPI_METRICS.map((option) => (
            <option key={option} value={option}>{option.toUpperCase()}</option>
          ))}
        </select>
      </label>

      <label className="tree-kpi-pill tree-kpi-pill--target">
        <span className="tree-kpi-pill-label">Target</span>
        <span className="tree-kpi-target-entry">
          <input
            aria-label="Target amount in euros"
            disabled={saving}
            inputMode="decimal"
            min="0"
            step="0.01"
            type="number"
            value={target}
            onChange={(event) => {
              setTarget(event.target.value);
              setMessage('Target changes save when you leave the field.');
              setError('');
            }}
            onBlur={handleTargetBlur}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
          />
          <span aria-hidden="true">€</span>
        </span>
      </label>

      <span aria-live="polite" className="tree-kpi-save-status" role={error ? 'alert' : 'status'}>
        {error || message}
      </span>
    </div>
  );
}
````

## File: webapp/app/page.tsx
````typescript
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert h-5 w-[100px]"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the{" "}
            <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
              page.tsx
            </code>{" "}
            file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert h-[14px] w-4"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={14}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
````

## File: webapp/public/file.svg
````xml
<svg fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M14.5 13.5V5.41a1 1 0 0 0-.3-.7L9.8.29A1 1 0 0 0 9.08 0H1.5v13.5A2.5 2.5 0 0 0 4 16h8a2.5 2.5 0 0 0 2.5-2.5m-1.5 0v-7H8v-5H3v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1M9.5 5V2.12L12.38 5zM5.13 5h-.62v1.25h2.12V5zm-.62 3h7.12v1.25H4.5zm.62 3h-.62v1.25h7.12V11z" clip-rule="evenodd" fill="#666" fill-rule="evenodd"/></svg>
````

## File: webapp/public/globe.svg
````xml
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g clip-path="url(#a)"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.27 14.1a6.5 6.5 0 0 0 3.67-3.45q-1.24.21-2.7.34-.31 1.83-.97 3.1M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.48-1.52a7 7 0 0 1-.96 0H7.5a4 4 0 0 1-.84-1.32q-.38-.89-.63-2.08a40 40 0 0 0 3.92 0q-.25 1.2-.63 2.08a4 4 0 0 1-.84 1.31zm2.94-4.76q1.66-.15 2.95-.43a7 7 0 0 0 0-2.58q-1.3-.27-2.95-.43a18 18 0 0 1 0 3.44m-1.27-3.54a17 17 0 0 1 0 3.64 39 39 0 0 1-4.3 0 17 17 0 0 1 0-3.64 39 39 0 0 1 4.3 0m1.1-1.17q1.45.13 2.69.34a6.5 6.5 0 0 0-3.67-3.44q.65 1.26.98 3.1M8.48 1.5l.01.02q.41.37.84 1.31.38.89.63 2.08a40 40 0 0 0-3.92 0q.25-1.2.63-2.08a4 4 0 0 1 .85-1.32 7 7 0 0 1 .96 0m-2.75.4a6.5 6.5 0 0 0-3.67 3.44 29 29 0 0 1 2.7-.34q.31-1.83.97-3.1M4.58 6.28q-1.66.16-2.95.43a7 7 0 0 0 0 2.58q1.3.27 2.95.43a18 18 0 0 1 0-3.44m.17 4.71q-1.45-.12-2.69-.34a6.5 6.5 0 0 0 3.67 3.44q-.65-1.27-.98-3.1" fill="#666"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h16v16H0z"/></clipPath></defs></svg>
````

## File: webapp/public/next.svg
````xml
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 394 80"><path fill="#000" d="M262 0h68.5v12.7h-27.2v66.6h-13.6V12.7H262V0ZM149 0v12.7H94v20.4h44.3v12.6H94v21h55v12.6H80.5V0h68.7zm34.3 0h-17.8l63.8 79.4h17.9l-32-39.7 32-39.6h-17.9l-23 28.6-23-28.6zm18.3 56.7-9-11-27.1 33.7h17.8l18.3-22.7z"/><path fill="#000" d="M81 79.3 17 0H0v79.3h13.6V17l50.2 62.3H81Zm252.6-.4c-1 0-1.8-.4-2.5-1s-1.1-1.6-1.1-2.6.3-1.8 1-2.5 1.6-1 2.6-1 1.8.3 2.5 1a3.4 3.4 0 0 1 .6 4.3 3.7 3.7 0 0 1-3 1.8zm23.2-33.5h6v23.3c0 2.1-.4 4-1.3 5.5a9.1 9.1 0 0 1-3.8 3.5c-1.6.8-3.5 1.3-5.7 1.3-2 0-3.7-.4-5.3-1s-2.8-1.8-3.7-3.2c-.9-1.3-1.4-3-1.4-5h6c.1.8.3 1.6.7 2.2s1 1.2 1.6 1.5c.7.4 1.5.5 2.4.5 1 0 1.8-.2 2.4-.6a4 4 0 0 0 1.6-1.8c.3-.8.5-1.8.5-3V45.5zm30.9 9.1a4.4 4.4 0 0 0-2-3.3 7.5 7.5 0 0 0-4.3-1.1c-1.3 0-2.4.2-3.3.5-.9.4-1.6 1-2 1.6a3.5 3.5 0 0 0-.3 4c.3.5.7.9 1.3 1.2l1.8 1 2 .5 3.2.8c1.3.3 2.5.7 3.7 1.2a13 13 0 0 1 3.2 1.8 8.1 8.1 0 0 1 3 6.5c0 2-.5 3.7-1.5 5.1a10 10 0 0 1-4.4 3.5c-1.8.8-4.1 1.2-6.8 1.2-2.6 0-4.9-.4-6.8-1.2-2-.8-3.4-2-4.5-3.5a10 10 0 0 1-1.7-5.6h6a5 5 0 0 0 3.5 4.6c1 .4 2.2.6 3.4.6 1.3 0 2.5-.2 3.5-.6 1-.4 1.8-1 2.4-1.7a4 4 0 0 0 .8-2.4c0-.9-.2-1.6-.7-2.2a11 11 0 0 0-2.1-1.4l-3.2-1-3.8-1c-2.8-.7-5-1.7-6.6-3.2a7.2 7.2 0 0 1-2.4-5.7 8 8 0 0 1 1.7-5 10 10 0 0 1 4.3-3.5c2-.8 4-1.2 6.4-1.2 2.3 0 4.4.4 6.2 1.2 1.8.8 3.2 2 4.3 3.4 1 1.4 1.5 3 1.5 5h-5.8z"/></svg>
````

## File: webapp/public/vercel.svg
````xml
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1155 1000"><path d="m577.3 0 577.4 1000H0z" fill="#fff"/></svg>
````

## File: webapp/public/window.svg
````xml
<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill-rule="evenodd" clip-rule="evenodd" d="M1.5 2.5h13v10a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM0 1h16v11.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 12.5zm3.75 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5M7 4.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0m1.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5" fill="#666"/></svg>
````

## File: webapp/.gitignore
````
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
````

## File: webapp/AGENTS.md
````markdown
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
````

## File: webapp/CLAUDE.md
````markdown
@AGENTS.md
````

## File: webapp/eslint.config.mjs
````javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
````

## File: webapp/playwright.config.ts
````typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
````

## File: webapp/postcss.config.mjs
````javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
````

## File: webapp/README.md
````markdown
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
````

## File: webapp/tsconfig.json
````json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
````

## File: fetch-campaigns.js
````javascript
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
````

## File: package.json
````json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.116.0",
    "axios": "^1.20.0"
  }
}
````

## File: webapp/app/tree/dateRange.ts
````typescript
export type RangeId =
  | 'today' | 'yesterday' | 'last7' | 'last30'
  | 'thisMonth' | 'lastMonth' | 'maximum' | 'custom';

export const PRESETS: { id: RangeId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'maximum', label: 'Maximum' },
];

export type ResolvedRange = { id: RangeId; label: string; text: string; from: string; to: string };
export type Totals = { spend: number; impressions: number; clicks: number; cpm: number | null };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function resolveRange(id?: string, from?: string, to?: string): ResolvedRange {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const today = utc(y, m, d);
  const yesterday = utc(y, m, d - 1);

  let rangeId: RangeId = PRESETS.some((p) => p.id === id) || id === 'custom' ? (id as RangeId) : 'maximum';
  let start: Date;
  let end: Date;

  switch (rangeId) {
    case 'today': start = today; end = today; break;
    case 'yesterday': start = yesterday; end = yesterday; break;
    case 'last7': start = utc(y, m, d - 7); end = yesterday; break;
    case 'last30': start = utc(y, m, d - 30); end = yesterday; break;
    case 'thisMonth': start = utc(y, m, 1); end = today; break;
    case 'lastMonth': start = utc(y, m - 1, 1); end = utc(y, m, 0); break;
    case 'custom':
      if (from && to && DAY.test(from) && DAY.test(to)) {
        start = new Date(from);
        end = new Date(to);
        if (start > end) [start, end] = [end, start];
      } else {
        rangeId = 'maximum';
        start = utc(2000, 0, 1);
        end = today;
      }
      break;
    default: start = utc(2000, 0, 1); end = today;
  }

  const label = rangeId === 'custom' ? 'Custom' : PRESETS.find((p) => p.id === rangeId)!.label;
  const text =
    rangeId === 'maximum' ? 'all available data' : start.getTime() === end.getTime() ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;

  return { id: rangeId, label, text, from: iso(start), to: iso(end) };
}

export function sumRows(rows: { spend: unknown; impressions: unknown; clicks: unknown }[]): Totals | null {
  if (!rows.length) return null;
  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  for (const r of rows) {
    spend += Number(r.spend) || 0;
    impressions += Number(r.impressions) || 0;
    clicks += Number(r.clicks) || 0;
  }
  return { spend, impressions, clicks, cpm: impressions > 0 ? (spend / impressions) * 1000 : null };
}

export function kpiFromTotals(metric: string, t: Totals | null): number | null {
  if (!t) return null;
  switch (metric.toLowerCase()) {
    case 'cpm': return t.cpm;
    case 'cpc': return t.clicks > 0 ? t.spend / t.clicks : null;
    case 'cpv':
    case 'cpa': return null;
    case 'ctr': return t.impressions > 0 ? (t.clicks / t.impressions) * 100 : null;
    default: return null;
  }
}
````

## File: webapp/app/layout.tsx
````typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meta-Plant",
  description: "Campaign optimization history, visualized as a plant",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={{ background: "#101c16", color: "#EDE7D9" }}
      >
        <nav
          style={{
            display: "flex",
            gap: 20,
            padding: "14px 24px",
            borderBottom: "1px solid #26362c",
            background: "#16241d",
          }}
        >
          <Link href="/campaigns" style={{ color: "#EDE7D9", textDecoration: "none" }}>Campaigns</Link>
          <Link href="/changes" style={{ color: "#EDE7D9", textDecoration: "none" }}>Log change</Link>
          <Link href="/tree" style={{ color: "#DCAE5C", textDecoration: "none" }}>Plant</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
````

## File: webapp/next.config.ts
````typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost', '*.app.github.dev'],
};

export default nextConfig;
````

## File: .gitignore
````
node_modules/
.env*
.github/agents/
.github/hooks/
.github/skills/
test-results/
playwright-report/
````

## File: check-kpi.js
````javascript
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
````

## File: .github/workflows/sync-campaigns.yml
````yaml
name: Sync campaign data

on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm install
      - run: node sync-campaigns.js
        env:
          META_ACCESS_TOKEN: ${{ secrets.META_ACCESS_TOKEN }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      - run: node check-kpi.js
        env:
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          ALERT_EMAIL_TO: ${{ secrets.ALERT_EMAIL_TO }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
````

## File: webapp/tests/smoke.spec.ts
````typescript
import { test, expect } from '@playwright/test';

test('navigation links reach the other pages', async ({ page }) => {
  await page.goto('/campaigns');
  await page.getByRole('link', { name: 'Log change' }).click();
  await expect(page.getByRole('heading', { name: 'Log a change' })).toBeVisible();
  await page.getByRole('link', { name: 'Plant' }).click();
  await expect(page).toHaveURL(/\/tree/);
});

test('campaigns page lists a campaign with a KPI target in euro', async ({ page }) => {
  await page.goto('/campaigns');
  const firstRow = page.locator('tbody tr').first();
  await expect(firstRow).toBeVisible();
  await expect(firstRow).toContainText('€');
});

test('plant page shows the live KPI status and opens a branch', async ({ page }) => {
  await page.goto('/tree');
  await expect(page.getByLabel('Current KPI status')).toContainText(/CPM [\d.,]+€/);
  const kpiMetric = page.getByLabel('KPI metric');
  await expect(kpiMetric).toHaveValue('cpm');
  await expect(kpiMetric.locator('option')).toHaveText(['CPC', 'CPM', 'CPV', 'CPA']);
  const target = page.getByLabel('Target amount in euros');
  await expect(target).toHaveValue('1');
  const branches = page.getByRole('button', { name: / on \d{4}-\d{2}-\d{2}/ });
  await expect(branches.first()).toBeVisible();
  await branches.first().click();
  await expect(page.getByText('Before', { exact: true })).toBeVisible();
  await expect(page.getByText('After', { exact: true })).toBeVisible();
});

test('plant page rejects a negative KPI target without saving', async ({ page }) => {
  await page.goto('/tree');
  const target = page.getByLabel('Target amount in euros');
  await target.fill('-1');
  await target.press('Tab');
  await expect(page.locator('.tree-kpi-save-status[role="alert"]')).toContainText('zero or more euros');
});

test('change form blocks submit when the date is missing', async ({ page }) => {
  await page.goto('/changes');
  await page.getByRole('button', { name: 'Log this change' }).click();
  const dateMissing = await page
    .locator('input[name="change_date"]')
    .evaluate((el: HTMLInputElement) => el.validity.valueMissing);
  expect(dateMissing).toBe(true);
});

test('date range picker switches the range', async ({ page }) => {
  await page.goto('/tree');
  await page.getByRole('button', { name: /date range/i }).click();
  await page.getByRole('button', { name: 'Last 7 days' }).click();
  await expect(page).toHaveURL(/range=last7/);
  await expect(page.getByLabel('Current KPI status')).toContainText('Last 7 days');
});
````

## File: webapp/package.json
````json
{
  "name": "webapp",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "playwright test"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.116.0",
    "next": "16.3.5",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "@playwright/test": "^1.64.0",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.3.5",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
````

## File: README.md
````markdown
# Meta-Plant

A campaign changelog that grows. Meta-Plant shows the optimization history of a Meta Ads campaign as a jade plant: every logged optimization is a branch, and its color shows whether the KPI got better or worse.


## Why

In paid social, optimizations are often tracked in a spreadsheet, and people open a separate tab to check if a change worked. Meta-Plant puts the change and its effect in one picture.

## Features

- Daily automatic sync of campaign performance from the Meta Marketing API
- Form to log an optimization (type, date, comment, KPI before and after)
- Plant view: each branch is one optimization. Sage = better than target, orange = worse, dashed gold line = KPI target
- Live KPI status with the distance to target, taken from the latest sync
- Editable campaign KPI settings on the plant page: choose CPC, CPM, CPV, or CPA and save a euro target
- CPV and CPA selections show no live value until video-view or conversion data is available
- Email alert when a campaign drops below its KPI target (sent once, until it recovers)
- Playwright smoke tests

## How it works

```
Meta Marketing API
        |
GitHub Actions (daily, 06:00 UTC)
        |
sync-campaigns.js  -->  Supabase (Postgres)  -->  Next.js pages
        |
check-kpi.js  -->  alert email (Resend)
```

## Tech stack

Next.js (App Router, TypeScript), Supabase, Meta Marketing API, GitHub Actions, Resend, Playwright.

## Project structure

```
.github/workflows/sync-campaigns.yml   daily sync + KPI check
sync-campaigns.js                      pulls Meta data into Supabase
check-kpi.js                           sends an alert email if the KPI is below target
fetch-campaigns.js                     read-only API test script
webapp/                                Next.js app (/campaigns, /changes, /tree)
webapp/tests/                          Playwright tests
```

## Data model

Three tables: `campaigns` (KPI metric and target), `insight_snapshots` (one row per sync), `changes` (logged optimizations). Row Level Security is enabled; the app reads and writes on the server only.

## Run locally

Needs Node 22+, a Supabase project, and a Meta system user token with `ads_read`.

Environment variables:

```
META_ACCESS_TOKEN
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY   (the Supabase secret key)
RESEND_API_KEY
ALERT_EMAIL_TO
```

```
npm install
node sync-campaigns.js
cd webapp
npm install
npm run dev
```

## Tests

```
cd webapp
npx playwright install chromium
npm test
```

The four smoke tests only read data: page navigation, campaign list, plant page with live KPI status, and form validation.

## Notes

- Built with a personal test ad account and test campaign.
- Internal prototype: there is no login yet, so do not deploy it publicly as it is.
- Next: AI-written trend summary per campaign, more tests (form submit, alert logic).
````

## File: sync-campaigns.js
````javascript
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
````

## File: webapp/app/tree/page.tsx
````typescript
import { createClient } from '@supabase/supabase-js';
import TreeView from './TreeView';
import { resolveRange, sumRows, kpiFromTotals } from './dateRange';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function TreePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const range = resolveRange(params.range, params.from, params.to);

  // For now: just grab the first campaign.
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
    .gte('change_date', range.from)
    .lte('change_date', range.to)
    .order('change_date', { ascending: true });

  const { data: snaps } = await supabase
    .from('insight_snapshots')
    .select('spend, impressions, clicks')
    .eq('campaign_id', campaign.id)
    .gte('snapshot_date', range.from)
    .lte('snapshot_date', range.to);

  const totals = sumRows(snaps ?? []);
  const liveValue = kpiFromTotals(campaign.kpi_metric, totals);

  return (
    <TreeView
      campaignName={campaign.name}
      campaignId={campaign.id}
      kpiMetric={campaign.kpi_metric}
      kpiTarget={campaign.kpi_target}
      changes={changes ?? []}
      liveValue={liveValue}
      range={range}
      totals={totals}
    />
  );
}
````

## File: webapp/app/globals.css
````css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-geist-sans), sans-serif;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.tree-header-copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.tree-kpi-settings {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
  margin-top: 6px;
  margin-left: auto;
}

.tree-kpi-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.tree-kpi-pill {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 42px;
  padding: 7px 13px;
  border: 1px solid rgba(217, 183, 106, 0.72);
  border-radius: 999px;
  background: rgba(217, 183, 106, 0.12);
  color: #F0D9A3;
  font-size: 13px;
}

.tree-kpi-pill-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tree-kpi-pill select,
.tree-kpi-target-entry input {
  border: 0;
  outline: 0;
  background: transparent;
  color: #F3EFE6;
  font: inherit;
}

.tree-kpi-pill select {
  min-width: 56px;
  font-weight: 750;
  cursor: pointer;
}

.tree-kpi-pill select option {
  color: #F3EFE6;
  background: #122a23;
}

.tree-kpi-target-entry {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  color: #F3EFE6;
  font-size: 17px;
  font-weight: 750;
}

.tree-kpi-target-entry input {
  width: 78px;
  padding: 0;
  font-size: 17px;
  font-weight: 750;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.tree-kpi-target-entry input::-webkit-inner-spin-button,
.tree-kpi-target-entry input::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

.tree-kpi-pill:focus-within {
  outline: 2px solid #F0D9A3;
  outline-offset: 3px;
}

.tree-kpi-save-status {
  max-width: 300px;
  min-height: 1em;
  color: #F0D9A3;
  font-size: 12px;
  text-align: right;
}

.tree-kpi-save-status:empty {
  display: none;
}

.tree-kpi-save-status[role="alert"] {
  color: #F0A28A;
}

@media (max-width: 560px) {
  .tree-header {
    flex-wrap: wrap;
  }

  .tree-kpi-settings {
    margin-top: 4px;
  }
}

.tree-layout {
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 860px) {
  .tree-layout {
    grid-template-columns: minmax(0, 1.8fr) minmax(260px, 0.9fr);
  }
}
````

## File: webapp/app/tree/TreeView.tsx
````typescript
'use client';

import { useState } from 'react';
import DateRangePicker from './DateRangePicker';
import KpiControls from './KpiControls';
import type { ResolvedRange, Totals } from './dateRange';

const PALETTE = {
  bg: '#0b1c17',
  bgDeep: '#0e1f1a',
  panel: '#122a23',
  panelBorder: '#29453a',
  panelSoft: '#17332c',
  parchment: '#F3EFE6',
  muted: '#9bb0a5',
  gold: '#D9B76A',
  goldSoft: '#F0D9A3',
  sage: '#96C49A',
  sageDeep: '#5D8A62',
  leafMuted: '#899057',
  leafMutedDeep: '#6D7550',
  leaf: '#9BAF42',
  leafDeep: '#74834A',
  optimization: '#DE8736',
  rust: '#D07C5A',
  rustDeep: '#9A4E3A',
  bark: '#5A4338',
  barkDeep: '#3E2D2A',
  pot: '#A96342',
  potRim: '#754632',
  potBand: '#854A35',
  potFoot: '#B77D5B',
  soil: '#403126',
  glow: 'rgba(122, 185, 149, 0.14)',
  shadow: 'rgba(6, 12, 10, 0.45)',
};

const LOWER_IS_BETTER = ['cpm', 'cpc', 'cpv', 'cpa'];
const HEALTH_Y = 260;
const TRUNK_BASE = { x: 450, y: 540 };
const TRUNK_WIGGLE = [
  { t: 0, dx: 0 },
  { t: 0.25, dx: 18 },
  { t: 0.5, dx: -14 },
  { t: 0.75, dx: 16 },
  { t: 1, dx: -5 },
];

function trunkX(t: number) {
  for (let i = 0; i < TRUNK_WIGGLE.length - 1; i++) {
    const a = TRUNK_WIGGLE[i];
    const b = TRUNK_WIGGLE[i + 1];
    if (t >= a.t && t <= b.t) {
      const localT = (t - a.t) / (b.t - a.t);
      return TRUNK_BASE.x + a.dx + (b.dx - a.dx) * localT;
    }
  }
  return TRUNK_BASE.x + TRUNK_WIGGLE[TRUNK_WIGGLE.length - 1].dx;
}

function buildTrunkPath(trunkTop: number) {
  const steps = 24;
  const baseWidth = 21;
  const topWidth = 6;
  const left: string[] = [];
  const right: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = trunkX(t);
    const y = TRUNK_BASE.y - t * (TRUNK_BASE.y - trunkTop);
    const halfWidth = baseWidth + (topWidth - baseWidth) * Math.pow(t, 0.82) + Math.max(0, 1 - t / 0.14) * 4;
    left.push(`${x - halfWidth} ${y}`);
    right.push(`${x + halfWidth} ${y}`);
  }

  [0.35, 0.7, 1].forEach((progress) => {
    const centerX = trunkX(1) - progress + progress * 2;
    const y = trunkTop - progress * 40;
    const halfWidth = topWidth - progress * 2.5;
    left.push(`${centerX - halfWidth} ${y}`);
    right.push(`${centerX + halfWidth} ${y}`);
  });

  const smoothCommands = (points: string[]) => {
    const coordinates = points.map((point) => point.split(' ').map(Number));
    return coordinates.slice(1).map(([x, y], index) => {
      const next = coordinates[index + 2];
      if (!next) return `Q ${x} ${y} ${x} ${y}`;
      return `Q ${x} ${y} ${(x + next[0]) / 2} ${(y + next[1]) / 2}`;
    }).join(' ');
  };
  const rightSide = right.slice().reverse();

  return `M ${left[0]} ${smoothCommands(left)} L ${rightSide[0]} ${smoothCommands(rightSide)} Z`;
}

function buildTrunkTexturePath(trunkTop: number, offset: number) {
  const points = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => {
    const y = TRUNK_BASE.y - t * (TRUNK_BASE.y - trunkTop);
    const x = trunkX(t) + offset * (1 - t * 0.55);
    return { x, y };
  });
  [0.35, 0.7, 1].forEach((progress) => {
    points.push({
      x: trunkX(1) + progress + offset * (0.45 - progress * 0.2),
      y: trunkTop - progress * 40,
    });
  });

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const next = points[index + 1];
    const end = next
      ? { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 }
      : point;
    return `${path} Q ${point.x} ${point.y} ${end.x} ${end.y}`;
  }, '');
}

type Change = {
  id: string;
  change_date: string;
  change_type: string;
  comment: string | null;
  metric_before: number | null;
  metric_after: number | null;
};

type FoliageMood = 'sage' | 'olive';

function formatMetric(value: number | null) {
  return value == null ? '—' : `${value.toLocaleString('en-US')}€`;
}

function formatTargetDelta(value: number, target: number, lowerBetter: boolean) {
  const difference = value - target;
  if (difference === 0) return 'on target';

  const better = lowerBetter ? difference < 0 : difference > 0;
  const word = better ? 'better than' : 'worse than';
  if (target === 0) return `${formatMetric(Math.abs(difference))} ${word} target`;

  const percentage = Math.abs((difference / target) * 100);
  const formatted = percentage < 10 ? percentage.toFixed(1) : Math.round(percentage).toString();
  return `${formatted}% ${word} target`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function computeLayout(changes: Change[], kpiTarget: number, kpiMetric: string, liveValue: number | null) {
  const lowerBetter = LOWER_IS_BETTER.includes(kpiMetric.toLowerCase());
  const relativePerformance = (value: number) => {
    if (kpiTarget === 0) return value === 0 ? 0 : lowerBetter ? -1 : 1;
    return lowerBetter
      ? (kpiTarget - value) / kpiTarget
      : (value - kpiTarget) / kpiTarget;
  };
  const hasHistoricalKpiValues = !['cpv', 'cpa'].includes(kpiMetric.toLowerCase());
  const latestChange = hasHistoricalKpiValues
    ? [...changes].reverse().find((change) => change.metric_after != null || change.metric_before != null)
    : undefined;
  const currentValue = liveValue ?? latestChange?.metric_after ?? latestChange?.metric_before ?? null;
  const latestValue = currentValue ?? kpiTarget;
  const foliageMood: FoliageMood = relativePerformance(latestValue) >= 0 ? 'sage' : 'olive';
  const trunkTop = clamp(HEALTH_Y + 22 - relativePerformance(latestValue) * 180, 110, 440);

  const branches = changes.map((c, i) => {
    const attachT = 0.14 + ((i + 1) / (changes.length + 1)) * 0.36;
    const attachY = TRUNK_BASE.y - attachT * (TRUNK_BASE.y - trunkTop);
    const value = c.metric_after ?? c.metric_before ?? kpiTarget;
    const relDiff = relativePerformance(value);
    const tipY = attachY - 70;
    const side = i % 2 === 0 ? -1 : 1;
    const status: 'above' | 'below' | 'onTarget' = relDiff > 0
      ? 'above'
      : relDiff < 0
        ? 'below'
        : 'onTarget';

    return {
      ...c,
      status,
      attach: { x: trunkX(attachT), y: attachY },
      tip: { x: trunkX(attachT) + side * 145, y: tipY },
    };
  });

  return { trunkTop, branches, foliageMood, currentValue };
}

function branchPath(b: { attach: { x: number; y: number }; tip: { x: number; y: number } }) {
  const cx = (b.attach.x + b.tip.x) / 2 + (b.tip.x < b.attach.x ? -20 : 20);
  const cy = (b.attach.y + b.tip.y) / 2;
  return `M ${b.attach.x} ${b.attach.y} Q ${cx} ${cy} ${b.tip.x} ${b.tip.y}`;
}

function JadeLeafPair({ x, y, angle, scale = 1, mood }: { x: number; y: number; angle: number; scale?: number; mood?: FoliageMood }) {
  const lightLeaf = mood === 'sage'
    ? PALETTE.sage
    : mood === 'olive'
      ? PALETTE.leafMuted
      : PALETTE.leaf;
  const darkLeaf = mood === 'sage'
    ? PALETTE.sageDeep
    : mood === 'olive'
      ? PALETTE.leafMutedDeep
      : PALETTE.leafDeep;
  const vein = mood === 'sage' ? '#B6D7B6' : mood === 'olive' ? '#A6A76E' : '#C0C66C';

  return (
    <g transform={`translate(${x}, ${y}) rotate(${angle}) scale(${scale})`}>
      <path d="M 0 0 C -9 -17 -31 -24 -34 -11 C -36 1 -17 8 0 0 Z" fill={lightLeaf} />
      <path d="M 0 0 C 9 -18 30 -24 34 -11 C 36 1 17 8 0 0 Z" fill={darkLeaf} />
      <path d="M -2 0 Q -19 -13 -31 -13 M 2 0 Q 19 -13 31 -13" fill="none" stroke={vein} strokeWidth="1.2" opacity="0.7" />
    </g>
  );
}

const FOLIAGE_SHOOTS = [
  { t: 0.16, side: -1, dist: 145, size: 0.92 },
  { t: 0.20, side: 1, dist: 108, size: 0.82 },
  { t: 0.25, side: -1, dist: 168, size: 1.05 },
  { t: 0.30, side: 1, dist: 156, size: 0.98 },
  { t: 0.34, side: -1, dist: 124, size: 0.86 },
  { t: 0.39, side: 1, dist: 140, size: 0.92 },
  { t: 0.44, side: -1, dist: 105, size: 0.82 },
  { t: 0.47, side: 1, dist: 157, size: 0.98 },
  { t: 0.52, side: -1, dist: 136, size: 0.91 },
  { t: 0.55, side: 1, dist: 108, size: 0.84 },
  { t: 0.59, side: -1, dist: 82, size: 0.76 },
  { t: 0.62, side: 1, dist: 66, size: 0.72 },
  { t: 0.68, side: -1, dist: 86, size: 0.76 },
  { t: 0.75, side: 1, dist: 96, size: 0.78 },
  { t: 0.82, side: -1, dist: 72, size: 0.68 },
];

function FoliageShoots({ trunkTop, mood }: { trunkTop: number; mood: FoliageMood }) {
  return (
    <g opacity="0.85" pointerEvents="none">
      {FOLIAGE_SHOOTS.map((f, i) => {
        const x = trunkX(f.t);
        const y = TRUNK_BASE.y - f.t * (TRUNK_BASE.y - trunkTop);
        const tipX = x + f.side * f.dist;
        const tipY = y - f.dist * 0.52;
        const angle = f.side < 0 ? -18 : 18;
        return (
          <g key={i}>
            <path
              d={`M ${x} ${y} Q ${x + f.side * f.dist * 0.3} ${y - f.dist * 0.42} ${tipX} ${tipY}`}
              fill="none"
              stroke={PALETTE.bark}
              strokeWidth={5.8 - f.t * 3}
              strokeLinecap="round"
            />
            <JadeLeafPair x={tipX} y={tipY} angle={angle} scale={f.size} mood={mood} />
          </g>
        );
      })}
    </g>
  );
}

function CrownShoot({ trunkTop, mood }: { trunkTop: number; mood: FoliageMood }) {
  const x = trunkX(1);

  return (
    <g fill="none" stroke={PALETTE.bark} strokeLinecap="round">
      <path d={`M ${x - 1} ${trunkTop - 7} Q ${x - 13} ${trunkTop - 14} ${x - 27} ${trunkTop - 15}`} strokeWidth="3.5" />
      <path d={`M ${x + 1} ${trunkTop - 18} Q ${x + 13} ${trunkTop - 23} ${x + 29} ${trunkTop - 21}`} strokeWidth="3.5" />
      <path d={`M ${x - 1} ${trunkTop - 27} Q ${x - 10} ${trunkTop - 34} ${x - 20} ${trunkTop - 37}`} strokeWidth="2.8" />
      <JadeLeafPair x={x - 28} y={trunkTop - 13} angle={-20} scale={0.58} mood={mood} />
      <JadeLeafPair x={x + 30} y={trunkTop - 19} angle={16} scale={0.58} mood={mood} />
      <JadeLeafPair x={x - 21} y={trunkTop - 35} angle={-24} scale={0.52} mood={mood} />
      <JadeLeafPair x={x + 1} y={trunkTop - 39} angle={4} scale={0.58} mood={mood} />
    </g>
  );
}

export default function TreeView({
  campaignName,
  campaignId,
  kpiMetric,
  kpiTarget,
  changes,
  liveValue,
  range,
  totals,
}: {
  campaignName: string;
  campaignId: string;
  kpiMetric: string;
  kpiTarget: number;
  changes: Change[];
  liveValue: number | null;
  range: ResolvedRange;
  totals: Totals | null;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const { trunkTop, branches, foliageMood, currentValue } = computeLayout(changes, kpiTarget, kpiMetric, liveValue);
  const previewId = hoveredId ?? focusedId ?? activeId;
  const active = branches.find((b) => b.id === previewId) ?? null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at top, rgba(36, 68, 54, 0.86), rgba(11, 28, 23, 1) 48%)',
        color: PALETTE.parchment,
        padding: '28px 24px 40px',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <header className="tree-header" style={{ marginBottom: 20 }}>
          <div className="tree-header-copy">
            <div style={{ color: PALETTE.muted, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Campaign overview
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 2vw + 1rem, 2.8rem)', lineHeight: 1.1, letterSpacing: '-0.05em' }}>
              {campaignName}
            </h1>
            <div aria-label="Current KPI status" style={{ color: foliageMood === 'sage' ? PALETTE.sage : PALETTE.optimization, fontSize: 13, lineHeight: 1.5 }}>
              {currentValue == null
                ? `No ${kpiMetric.toUpperCase()} data in ${range.label}`
                : `${kpiMetric.toUpperCase()} ${formatMetric(currentValue)} · ${formatTargetDelta(currentValue, kpiTarget, LOWER_IS_BETTER.includes(kpiMetric.toLowerCase()))} · ${range.label}`}
            </div>
          </div>
          <div className="tree-kpi-settings">
            <DateRangePicker range={range} />
            <KpiControls
              campaignId={campaignId}
              initialMetric={kpiMetric}
              initialTarget={kpiTarget}
            />
          </div>
        </header>

        {totals && (
          <div aria-label="Performance totals" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            {[
              ['Spend', `${totals.spend.toLocaleString('en-US', { maximumFractionDigits: 2 })}€`],
              ['Impressions', totals.impressions.toLocaleString('en-US')],
              ['Clicks', totals.clicks.toLocaleString('en-US')],
              ['CPM', totals.cpm == null ? '—' : `${totals.cpm.toFixed(2)}€`],
            ].map(([name, value]) => (
              <div key={name} style={{ minWidth: 120, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${PALETTE.panelBorder}` }}>
                <div style={{ color: PALETTE.muted, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{name}</div>
                <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="tree-layout" style={{ display: 'grid', gap: 20, alignItems: 'stretch' }}>
          <section
            style={{
              background: 'linear-gradient(180deg, rgba(18, 42, 35, 0.98), rgba(14, 31, 26, 0.98))',
              border: `1px solid ${PALETTE.panelBorder}`,
              borderRadius: 18,
              boxShadow: `0 18px 40px ${PALETTE.shadow}`,
              padding: 18,
              minHeight: 560,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, color: PALETTE.muted, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <span>Plant health</span>
              <span style={{ color: PALETTE.goldSoft }}>{branches.length} changes</span>
            </div>

            <svg
              viewBox="0 0 900 680"
              role="img"
              aria-label={`${campaignName} KPI growth tree`}
              style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12 }}
            >
              <defs>
                <clipPath id="trunkClip">
                  <path d={buildTrunkPath(trunkTop)} />
                </clipPath>
              </defs>

              <line x1="0" x2="900" y1={HEALTH_Y} y2={HEALTH_Y} stroke={PALETTE.gold} strokeDasharray="6 6" strokeWidth="1.5" opacity="0.72" />
              <text x="20" y={HEALTH_Y - 10} fill={PALETTE.goldSoft} fontSize="13" letterSpacing="0.08em">
                {kpiMetric.toUpperCase()} target · {kpiTarget}€
              </text>

              <path
                d="M 390 539 Q 378 554 380 580 Q 382 605 391 619 Q 395 626 407 629 L 493 629 Q 505 626 509 619 Q 518 605 520 580 Q 522 554 510 539 Z"
                fill={PALETTE.pot}
              />
              <path d="M 389 609 Q 450 622 511 609 L 508 624 Q 450 638 392 624 Z" fill={PALETTE.potBand} />
              <path d="M 392 623 Q 450 637 508 623 Q 505 635 498 641 Q 490 645 478 642 Q 450 649 422 642 Q 410 645 402 641 Q 395 635 392 623 Z" fill={PALETTE.potFoot} />
              <path d="M 399 635 Q 450 647 501 635" fill="none" stroke="#8F6047" strokeWidth="2" opacity="0.78" />
              <path d="M 382 537 C 382 526 412 517 450 517 C 488 517 518 526 518 537 C 518 548 488 555 450 555 C 412 555 382 548 382 537 Z" fill={PALETTE.potRim} />
              <path d="M 384 535 C 397 525 424 521 450 521 C 476 521 503 525 516 535" fill="none" stroke="#B77D5B" strokeWidth="2" opacity="0.72" />
              <ellipse cx="450" cy="537" rx="59" ry="12" fill={PALETTE.soil} />

              <FoliageShoots trunkTop={trunkTop} mood={foliageMood} />
              <path d={buildTrunkPath(trunkTop)} fill={PALETTE.bark} />
              <g clipPath="url(#trunkClip)" fill="none" strokeLinecap="round">
                <path d={buildTrunkTexturePath(trunkTop, -10)} stroke={PALETTE.barkDeep} strokeWidth="3" opacity="0.56" />
                <path d={buildTrunkTexturePath(trunkTop, -3)} stroke="#80604A" strokeWidth="5" opacity="0.32" />
                <path d={buildTrunkTexturePath(trunkTop, 5)} stroke={PALETTE.barkDeep} strokeWidth="2" opacity="0.46" />
                <path d={buildTrunkTexturePath(trunkTop, 11)} stroke="#80604A" strokeWidth="3" opacity="0.24" />
              </g>
              <CrownShoot trunkTop={trunkTop} mood={foliageMood} />

              {branches.map((b) => {
                const angle = b.tip.x < b.attach.x ? -35 : 35;
                const isPreviewed = hoveredId === b.id || focusedId === b.id;
                const isActive = activeId === b.id || isPreviewed;
                const statusColor = b.status === 'above'
                  ? PALETTE.sage
                  : b.status === 'below'
                    ? PALETTE.optimization
                    : PALETTE.gold;
                const tooltipWidth = 136;
                const tooltipX = b.tip.x < b.attach.x
                  ? b.tip.x - tooltipWidth - 16
                  : b.tip.x + 16;
                const tooltipY = b.tip.y - 48;
                return (
                  <g
                    key={b.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${b.change_type} on ${b.change_date}`}
                    onMouseEnter={() => setHoveredId(b.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onFocus={() => setFocusedId(b.id)}
                    onBlur={() => setFocusedId(null)}
                    onClick={() => setActiveId((prev) => (prev === b.id ? null : b.id))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setActiveId((prev) => (prev === b.id ? null : b.id));
                      }
                    }}
                    style={{ cursor: 'pointer', outline: 'none' }}
                  >
                    <path
                      d={branchPath(b)}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={24}
                      strokeLinecap="round"
                      pointerEvents="stroke"
                      aria-hidden="true"
                    />
                    <path
                      d={branchPath(b)}
                      fill="none"
                      stroke={statusColor}
                      strokeWidth={isActive ? 7 : 5}
                      strokeLinecap="round"
                      opacity={isActive ? 1 : 0.88}
                    />
                    <circle
                      cx={b.tip.x}
                      cy={b.tip.y}
                      r={isActive ? 11 : 8}
                      fill="none"
                      stroke={PALETTE.parchment}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      opacity={isActive ? 1 : 0.78}
                    />
                    <JadeLeafPair x={b.tip.x} y={b.tip.y} angle={angle} scale={0.95} />
                    <circle
                      cx={b.attach.x}
                      cy={b.attach.y}
                      r={isActive ? 6 : 4.5}
                      fill={statusColor}
                      stroke={isActive ? PALETTE.parchment : 'transparent'}
                      strokeWidth={isActive ? 1.2 : 0}
                    />
                    {isPreviewed && (
                      <g role="tooltip" pointerEvents="none">
                        <rect
                          x={tooltipX}
                          y={tooltipY}
                          width={tooltipWidth}
                          height={38}
                          rx={6}
                          fill={PALETTE.panel}
                          stroke={statusColor}
                          strokeWidth={1}
                        />
                        <text x={tooltipX + 9} y={tooltipY + 15} fill={PALETTE.muted} fontSize={10}>
                          {b.change_date}
                        </text>
                        <text x={tooltipX + 9} y={tooltipY + 30} fill={PALETTE.parchment} fontSize={11} fontWeight={600}>
                          {b.change_type.replace(/_/g, ' ')}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              <path d="M 392 537 C 420 550 480 550 508 537" fill="none" stroke="#78634D" strokeWidth="3" opacity="0.9" />
              <path d="M 384 537 C 384 547 414 554 450 554 C 486 554 516 547 516 537" fill="none" stroke="#7D8980" strokeWidth="2" opacity="0.9" />
            </svg>
            <div aria-label="Plant status legend" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 20px', padding: '8px 4px 0', color: PALETTE.muted, fontSize: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: PALETTE.sage }} />
                Better than target
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: PALETTE.optimization }} />
                Worse than target
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <span aria-hidden="true" style={{ width: 18, borderTop: `1px dashed ${PALETTE.gold}` }} />
                Target
              </span>
            </div>
          </section>

          <aside
            style={{
              background: 'linear-gradient(180deg, rgba(18, 42, 35, 0.98), rgba(13, 28, 24, 0.96))',
              border: `1px solid ${PALETTE.panelBorder}`,
              borderRadius: 18,
              boxShadow: `0 18px 40px ${PALETTE.shadow}`,
              padding: 18,
              minHeight: 560,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
            }}
          >
            {active ? (
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: PALETTE.muted, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {active.change_date}
                  </span>
                  {(() => {
                    const statusColor = active.status === 'above'
                      ? PALETTE.sage
                      : active.status === 'below'
                        ? PALETTE.optimization
                        : PALETTE.gold;
                    const statusLabel = active.status === 'above'
                      ? 'Better than target'
                      : active.status === 'below'
                        ? 'Worse than target'
                        : 'On target';
                    return (
                      <span
                        style={{
                          background: active.status === 'above' ? 'rgba(150, 196, 154, 0.12)' : active.status === 'below' ? 'rgba(222, 135, 54, 0.14)' : 'rgba(217, 183, 106, 0.12)',
                          color: statusColor,
                          border: `1px solid ${statusColor}55`,
                          borderRadius: 999,
                          padding: '5px 9px',
                          fontSize: 11,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {statusLabel}
                      </span>
                    );
                  })()}
                </div>

                <div>
                  <div style={{ color: PALETTE.muted, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Change
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em' }}>
                    {active.change_type.replace(/_/g, ' ')}
                  </div>
                </div>

                {active.comment ? (
                  <p style={{ margin: 0, color: PALETTE.muted, lineHeight: 1.7, fontSize: 15 }}>{active.comment}</p>
                ) : (
                  <p style={{ margin: 0, color: PALETTE.muted, lineHeight: 1.7, fontSize: 15 }}>No commentary provided for this change.</p>
                )}

                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${PALETTE.panelBorder}`, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ color: PALETTE.muted, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Before</div>
                    <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700 }}>{formatMetric(active.metric_before)}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${PALETTE.panelBorder}`, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ color: PALETTE.muted, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>After</div>
                    <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700 }}>{formatMetric(active.metric_after)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: PALETTE.muted, fontSize: 15, lineHeight: 1.7, textAlign: 'center' }}>
                Click a branch to inspect the campaign change behind that growth signal.
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
````
