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