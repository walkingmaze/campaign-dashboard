'use client';

import { useState } from 'react';

const PALETTE = {
  bg: '#101c16',
  panel: '#16241d',
  panelBorder: '#26362c',
  parchment: '#EDE7D9',
  muted: '#93a396',
  gold: '#DCAE5C',
  sage: '#8FBF8A',
  sageDeep: '#5F8C5C',
  rust: '#C1694B',
  rustDeep: '#8C4A34',
  bark: '#5B4636',
  pot: '#A5583A',
  potRim: '#8A472E',
};

const LOWER_IS_BETTER = ['cpm', 'cpc', 'cpa'];
const HEALTH_Y = 260;
const TRUNK_BASE = { x: 450, y: 540 };
const SPACING = 90;

type Change = {
  id: string;
  change_date: string;
  change_type: string;
  comment: string | null;
  metric_before: number | null;
  metric_after: number | null;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function computeLayout(changes: Change[], kpiTarget: number, kpiMetric: string) {
  const lowerBetter = LOWER_IS_BETTER.includes(kpiMetric.toLowerCase());
  const trunkTop = Math.max(90, TRUNK_BASE.y - 60 - changes.length * SPACING);

  const branches = changes.map((c, i) => {
    const attachY = TRUNK_BASE.y - 60 - (i + 1) * SPACING;
    const value = c.metric_after ?? c.metric_before ?? kpiTarget;
    const relDiff = lowerBetter
      ? (kpiTarget - value) / kpiTarget
      : (value - kpiTarget) / kpiTarget;
    const tipY = clamp(HEALTH_Y - relDiff * 240, 60, 520);
    const tipXOffset = i % 2 === 0 ? -150 : 150;
    const status: 'above' | 'below' = relDiff >= 0 ? 'above' : 'below';

    return {
      ...c,
      status,
      attach: { x: TRUNK_BASE.x, y: attachY },
      tip: { x: TRUNK_BASE.x + tipXOffset, y: tipY },
    };
  });

  return { trunkTop, branches };
}

function branchPath(b: { attach: { x: number; y: number }; tip: { x: number; y: number } }) {
  const cx = (b.attach.x + b.tip.x) / 2 + (b.tip.x < b.attach.x ? -20 : 20);
  const cy = (b.attach.y + b.tip.y) / 2;
  return `M ${b.attach.x} ${b.attach.y} Q ${cx} ${cy} ${b.tip.x} ${b.tip.y}`;
}

// A jade leaf: a plump oval, rotated to angle away from the stem
function JadeLeafPair({ x, y, angle, healthy }: { x: number; y: number; angle: number; healthy: boolean }) {
  const fill = healthy ? PALETTE.sage : PALETTE.rust;
  const fillDeep = healthy ? PALETTE.sageDeep : PALETTE.rustDeep;
  const size = healthy ? 1 : 0.75; // shrunken when below target
  const opacity = healthy ? 1 : 0.85;

  return (
    <g transform={`translate(${x}, ${y}) rotate(${angle}) scale(${size})`} opacity={opacity}>
      <ellipse cx="-11" cy="0" rx="12" ry="7" fill={fill} transform="rotate(-20 -11 0)" />
      <ellipse cx="11" cy="2" rx="11" ry="6.5" fill={fillDeep} transform="rotate(20 11 2)" />
    </g>
  );
}

export default function TreeView({
  campaignName,
  kpiMetric,
  kpiTarget,
  changes,
}: {
  campaignName: string;
  kpiMetric: string;
  kpiTarget: number;
  changes: Change[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { trunkTop, branches } = computeLayout(changes, kpiTarget, kpiMetric);
  const active = branches.find((b) => b.id === activeId) ?? null;

  return (
    <div style={{ minHeight: '100vh', background: PALETTE.bg, color: PALETTE.parchment, padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 4 }}>{campaignName}</h1>
      <div style={{ color: PALETTE.muted, marginBottom: 20 }}>
        {kpiMetric.toUpperCase()} target: {kpiTarget}€
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 600px', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}`, borderRadius: 12, padding: 16 }}>
          <svg viewBox="0 0 900 680" style={{ width: '100%', height: 'auto' }}>
            <line x1="0" x2="900" y1={HEALTH_Y} y2={HEALTH_Y} stroke={PALETTE.gold} strokeDasharray="6 6" strokeWidth="1.5" opacity="0.7" />
            <text x="20" y={HEALTH_Y - 10} fill={PALETTE.gold} fontSize="13">
              {kpiMetric.toUpperCase()} target · {kpiTarget}€
            </text>

            {/* Stem */}
            <path
              d={`M 440 540 C 436 420, 442 260, 446 ${trunkTop} L 454 ${trunkTop} C 458 260, 464 420, 460 540 Z`}
              fill={PALETTE.bark}
            />

            {/* Branches + leaf pairs */}
            {branches.map((b) => {
              const angle = b.tip.x < b.attach.x ? -35 : 35;
              return (
                <g key={b.id} onClick={() => setActiveId((prev) => (prev === b.id ? null : b.id))} style={{ cursor: 'pointer' }}>
                  <path
                    d={branchPath(b)}
                    fill="none"
                    stroke={b.status === 'above' ? PALETTE.sage : PALETTE.rust}
                    strokeWidth={activeId === b.id ? 4 : 2.5}
                  />
                  <JadeLeafPair x={b.tip.x} y={b.tip.y} angle={angle} healthy={b.status === 'above'} />
                  <circle cx={b.attach.x} cy={b.attach.y} r="4" fill={b.status === 'above' ? PALETTE.sage : PALETTE.rust} />
                </g>
              );
            })}

            {/* Pot */}
            <path
              d="M 375 539 Q 345 565, 350 595 Q 355 625, 375 650 L 525 650 Q 545 625, 550 595 Q 555 565, 525 539 Z"
              fill={PALETTE.pot}
            />
            <rect x="355" y="515" width="190" height="26" rx="13" fill={PALETTE.potRim} />
          </svg>
        </div>

        <div style={{ flex: '1 1 280px', background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}`, borderRadius: 12, padding: 16 }}>
          {active ? (
            <div>
              <div style={{ color: PALETTE.muted, fontSize: 12 }}>{active.change_date}</div>
              <div style={{ fontSize: 18, margin: '6px 0' }}>{active.change_type.replace('_', ' ')}</div>
              <div style={{ marginBottom: 10 }}>{active.comment}</div>
              <div style={{ color: PALETTE.muted, fontSize: 13 }}>
                {active.metric_before != null ? `${active.metric_before}€` : '—'} → <span style={{ color: PALETTE.parchment }}>{active.metric_after != null ? `${active.metric_after}€` : '—'}</span>
              </div>
            </div>
          ) : (
            <div style={{ color: PALETTE.muted }}>Click a branch to see its details.</div>
          )}
        </div>
      </div>
    </div>
  );
}