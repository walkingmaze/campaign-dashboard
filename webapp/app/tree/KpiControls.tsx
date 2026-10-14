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
