'use client';

import { useState } from 'react';
import DateRangePicker from './DateRangePicker';
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

const LOWER_IS_BETTER = ['cpm', 'cpc', 'cpa'];
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
  const relativePerformance = (value: number) => lowerBetter
    ? (kpiTarget - value) / kpiTarget
    : (value - kpiTarget) / kpiTarget;
  const latestChange = [...changes].reverse().find((change) => change.metric_after != null || change.metric_before != null);
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
  kpiMetric,
  kpiTarget,
  changes,
  liveValue,
  range,
  totals,
}: {
  campaignName: string;
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <DateRangePicker range={range} />
            <div className="tree-kpi-target" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content', padding: '8px 12px', borderRadius: 999, background: 'rgba(32, 55, 47, 0.9)', border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.goldSoft, fontSize: 13 }}>
              <span style={{ opacity: 0.85, letterSpacing: '0.04em' }}>{kpiMetric.toUpperCase()}</span>
              <span style={{ opacity: 0.7 }}>target:</span>
              <span style={{ fontWeight: 700, color: PALETTE.parchment }}>{kpiTarget.toLocaleString('en-US')}€</span>
            </div>
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