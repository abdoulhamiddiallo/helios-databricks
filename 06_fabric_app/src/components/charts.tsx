import { useMemo, useState, type ReactNode } from "react";
import { useSize } from "@/hooks/use-size";
import { COLORS, heatColor, kpColor, stormLevel, ballisticHours, AU_KM } from "@/lib/space";
import { fmt } from "@/lib/helios-data";

// ---------- outils ----------
const lin = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const span = max - min;
  const step0 = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = (count * step0) / span;
  const step = step0 * (err <= 0.15 ? 10 : err <= 0.35 ? 5 : err <= 0.75 ? 2 : 1);
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x + 14, 4), width - 214);
  return (
    <div
      className="pointer-events-none absolute z-10 w-[200px] rounded-xl border border-edge bg-[#0b1324f2] px-3 py-2 text-[12px] shadow-xl backdrop-blur"
      style={{ left, top: Math.max(y - 10, 0) }}
    >
      {children}
    </div>
  );
}

// ---------- séries temporelles ----------
export interface TimeSeries {
  name: string;
  color: string;
  points: { t: Date; v: number | null }[];
  width?: number;
  dashed?: boolean;
  area?: boolean;
}

export function TimeChart({ series, height = 240, unit = "", zones = [], refLines = [], digits = 0, yMin, yMax }: {
  series: TimeSeries[];
  height?: number;
  unit?: string;
  zones?: { from: number; to: number; color: string; label?: string }[];
  refLines?: { y: number; color: string; label: string }[];
  digits?: number;
  yMin?: number;
  yMax?: number;
}) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { l: 46, r: 14, t: 10, b: 26 };

  const all = series.flatMap((s) => s.points.filter((p) => p.v !== null));
  const times = all.map((p) => p.t.getTime());
  const vals = all.map((p) => p.v as number);
  const t0 = Math.min(...times), t1 = Math.max(...times);
  let v0 = yMin ?? Math.min(...vals, ...refLines.map((r) => r.y));
  let v1 = yMax ?? Math.max(...vals, ...refLines.map((r) => r.y));
  const pad = (v1 - v0) * 0.08 || 1;
  if (yMin === undefined) v0 -= pad;
  if (yMax === undefined) v1 += pad;
  const x = lin(t0, t1, m.l, Math.max(width - m.r, m.l + 1));
  const y = lin(v0, v1, height - m.b, m.t);
  const yt = niceTicks(v0, v1, 4);
  const xt = useMemo(() => {
    if (!Number.isFinite(t0)) return [];
    if ((t1 - t0) / 86400000 > 3 * 365) {
      // repères ronds : décennies ou demi-siècles selon la largeur
      const y0 = new Date(t0).getUTCFullYear(), y1 = new Date(t1).getUTCFullYear();
      const steps = [10, 20, 25, 50, 100];
      const step = steps.find((s) => ((y1 - y0) / s) * 70 <= width) ?? 100;
      const out: Date[] = [];
      for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) out.push(new Date(Date.UTC(y, 0, 1)));
      return out;
    }
    // repères ronds en heures ou en jours UTC
    const H = 3600e3;
    const maxTicks = Math.max(2, Math.floor(width / 120));
    const steps = [1, 2, 3, 6, 12, 24, 48, 72, 168, 336, 720].map((h) => h * H);
    const step = steps.find((s) => (t1 - t0) / s <= maxTicks) ?? steps[steps.length - 1];
    const out: Date[] = [];
    for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) out.push(new Date(t));
    return out;
  }, [t0, t1, width]);
  const spanDays = (t1 - t0) / 86400000;

  const path = (pts: { t: Date; v: number | null }[]) => {
    let d = "";
    let pen = false;
    for (const p of pts) {
      if (p.v === null) { pen = false; continue; }
      d += `${pen ? "L" : "M"}${x(p.t.getTime()).toFixed(1)},${y(p.v).toFixed(1)}`;
      pen = true;
    }
    return d;
  };

  const base = series[0]?.points ?? [];
  const onMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0, bd = Infinity;
    base.forEach((p, i) => {
      const d = Math.abs(x(p.t.getTime()) - px);
      if (d < bd) { bd = d; best = i; }
    });
    setHover(base.length ? best : null);
  };

  const hp = hover !== null ? base[hover] : null;
  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      {width > 0 && all.length > 0 && (
        <svg width={width} height={height}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={i} id={`area-${s.name.replace(/\W/g, "")}-${i}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {zones.map((z, i) => {
            const ya = y(Math.min(Math.max(z.to, v0), v1)), yb = y(Math.min(Math.max(z.from, v0), v1));
            return (
              <g key={i}>
                <rect x={m.l} width={width - m.l - m.r} y={Math.min(ya, yb)} height={Math.abs(yb - ya)} fill={z.color} opacity={0.12} />
                {z.label && Math.abs(yb - ya) > 14 && (
                  <text x={width - m.r - 6} y={Math.max(ya, yb) - 6} textAnchor="end" fontSize="10.5" fill={z.color}>{z.label}</text>
                )}
              </g>
            );
          })}
          {yt.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke={COLORS.grid} />
              <text x={m.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={COLORS.muted}>{t.toLocaleString("fr-FR")}</text>
            </g>
          ))}
          {xt.map((t, i) => (
            <text key={i} x={x(t.getTime())} y={height - 6} textAnchor="middle" fontSize="11" fill={COLORS.muted}>
              {spanDays > 3 * 365 ? t.getUTCFullYear() : spanDays > 2 || t.getUTCHours() === 0 ? fmt.dayShort(t) : fmt.hour(t)}
            </text>
          ))}
          {refLines.map((r) => (
            <g key={r.label}>
              <line x1={m.l} x2={width - m.r} y1={y(r.y)} y2={y(r.y)} stroke={r.color} strokeDasharray="5 5" opacity={0.8} />
              <text x={m.l + 6} y={y(r.y) - 5} fontSize="10.5" fill={r.color}>{r.label}</text>
            </g>
          ))}
          {series.map((s, i) => (
            <g key={s.name}>
              {s.area && (
                <path d={`${path(s.points)}L${x(t1)},${y(Math.max(v0, 0))}L${x(t0)},${y(Math.max(v0, 0))}Z`} fill={`url(#area-${s.name.replace(/\W/g, "")}-${i})`} />
              )}
              <path d={path(s.points)} fill="none" stroke={s.color} strokeWidth={s.width ?? 2.2} strokeDasharray={s.dashed ? "5 4" : undefined} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          ))}
          {hp && (
            <g>
              <line x1={x(hp.t.getTime())} x2={x(hp.t.getTime())} y1={m.t} y2={height - m.b} stroke="#ffffff40" />
              {series.map((s) => {
                const p = s.points[hover as number];
                return p && p.v !== null ? <circle key={s.name} cx={x(p.t.getTime())} cy={y(p.v)} r={4} fill={s.color} stroke="#04060d" strokeWidth={2} /> : null;
              })}
            </g>
          )}
        </svg>
      )}
      {hp && (
        <Tooltip x={x(hp.t.getTime())} y={10} width={width}>
          <div className="mb-1 text-muted">{spanDays > 3 * 365 ? hp.t.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }) : fmt.dateTime(hp.t)}</div>
          {series.map((s) => {
            const p = s.points[hover as number];
            return (
              <div key={s.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-muted"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</span>
                <span className="num font-semibold text-ink">{p && p.v !== null ? fmt.dec(p.v, digits) : "–"} {unit}</span>
              </div>
            );
          })}
        </Tooltip>
      )}
    </div>
  );
}

// ---------- Kp toutes les 3 heures ----------
export function KpBars({ points, height = 200 }: { points: { t: Date; kp: number }[]; height?: number }) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { l: 30, r: 8, t: 8, b: 24 };
  const n = points.length;
  const bw = n ? (width - m.l - m.r) / n : 0;
  const y = lin(0, 9, height - m.b, m.t);
  const days = points.filter((p, i) => i === 0 || p.t.getUTCDate() !== points[i - 1].t.getUTCDate());
  return (
    <div ref={ref} className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height}>
          {[0, 3, 5, 7, 9].map((k) => (
            <g key={k}>
              <line x1={m.l} x2={width - m.r} y1={y(k)} y2={y(k)} stroke={k >= 5 ? kpColor(k) : COLORS.grid} strokeDasharray={k >= 5 ? "4 4" : undefined} opacity={k >= 5 ? 0.6 : 1} />
              <text x={m.l - 6} y={y(k) + 4} textAnchor="end" fontSize="11" fill={COLORS.muted}>{k}</text>
            </g>
          ))}
          {points.map((p, i) => (
            <rect key={i} x={m.l + i * bw + 1} width={Math.max(bw - 2, 1)} y={y(p.kp)} height={Math.max(y(0) - y(p.kp), 1.5)} rx={2}
              fill={kpColor(p.kp)} opacity={hover === null || hover === i ? 1 : 0.45} onMouseEnter={() => setHover(i)} />
          ))}
          {days.map((p) => {
            const i = points.indexOf(p);
            return <text key={i} x={m.l + i * bw + 2} y={height - 6} fontSize="11" fill={COLORS.muted}>{fmt.dayShort(p.t)}</text>;
          })}
        </svg>
      )}
      {hover !== null && points[hover] && (
        <Tooltip x={m.l + hover * bw} y={4} width={width}>
          <div className="text-muted">{fmt.dateTime(points[hover].t)} (3 h)</div>
          <div className="mt-0.5 flex justify-between"><span className="text-muted">Kp</span><span className="num font-semibold" style={{ color: kpColor(points[hover].kp) }}>{fmt.kp(points[hover].kp)}</span></div>
          <div className="text-[11px]" style={{ color: kpColor(points[hover].kp) }}>{stormLevel(points[hover].kp).label}</div>
        </Tooltip>
      )}
    </div>
  );
}

// ---------- jauge Kp ----------
export function KpGauge({ kp, size = 280 }: { kp: number | null; size?: number }) {
  const cx = size / 2, cy = size * 0.56, r = size * 0.42;
  const ang = (k: number) => Math.PI + (k / 9) * Math.PI;
  const pt = (k: number, rr: number) => [cx + rr * Math.cos(ang(k)), cy + rr * Math.sin(ang(k))];
  const arc = (k0: number, k1: number, rr: number) => {
    const [x0, y0] = pt(k0, rr), [x1, y1] = pt(k1, rr);
    return `M${x0},${y0} A${rr},${rr} 0 0 1 ${x1},${y1}`;
  };
  const bands = [
    { a: 0, b: 4, c: COLORS.calm }, { a: 4, b: 4.66, c: "#A3E635" }, { a: 4.66, b: 5.66, c: COLORS.g1 },
    { a: 5.66, b: 6.66, c: COLORS.g2 }, { a: 6.66, b: 7.66, c: COLORS.g3 }, { a: 7.66, b: 9, c: COLORS.g5 },
  ];
  const level = stormLevel(kp);
  const k = Math.max(0, Math.min(9, kp ?? 0));
  const [nx, ny] = pt(k, r - 4);
  return (
    <svg width={size} height={size * 0.68} viewBox={`-12 0 ${size + 24} ${size * 0.68}`} overflow="visible">
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      <path d={arc(0, 9, r)} stroke="#121c33" strokeWidth={22} fill="none" strokeLinecap="round" />
      {bands.map((b) => (
        <path key={b.a} d={arc(b.a + 0.04, b.b - 0.04, r)} stroke={b.c} strokeWidth={b.b <= k ? 22 : 10} opacity={b.a <= k ? 1 : 0.28} fill="none" />
      ))}
      {Array.from({ length: 10 }).map((_, i) => {
        const [tx, ty] = pt(i, r + 22);
        return <text key={i} x={tx} y={ty + 4} textAnchor="middle" fontSize="11" fill={COLORS.muted}>{i}</text>;
      })}
      {[["G1", 5.2], ["G3", 7.2], ["G5", 8.5]].map(([l, kk]) => {
        const [tx, ty] = pt(kk as number, r - 30);
        return <text key={l as string} x={tx} y={ty + 4} textAnchor="middle" fontSize="10" fill={COLORS.muted} opacity={0.7}>{l}</text>;
      })}
      <circle cx={nx} cy={ny} r={12} fill={level.color} filter="url(#glow)" opacity={0.8} />
      <circle cx={nx} cy={ny} r={7} fill={level.color} stroke="#04060d" strokeWidth={3} />
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize={size * 0.2} fontWeight={600} fill={COLORS.ink} className="num">
        {kp === null ? "–" : fmt.kp(kp)}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="12" fill={COLORS.muted}>indice Kp planétaire</text>
    </svg>
  );
}

// ---------- globe des aurores ----------
export function AuroraGlobe({ latitude, size = 240 }: { latitude: number | null; size?: number }) {
  const cx = size / 2, cy = size / 2, R = size * 0.42;
  // projection orthographique vue du dessus du pôle Nord
  const rLat = (lat: number) => R * Math.cos((lat * Math.PI) / 180);
  const cities = [
    { n: "Oslo", lat: 59.9, a: -80 }, { n: "Édimbourg", lat: 55.9, a: -110 }, { n: "Metz", lat: 49.1, a: -95 },
    { n: "Montréal", lat: 45.5, a: -180 }, { n: "Reykjavik", lat: 64.1, a: -130 },
  ];
  const ring = latitude !== null ? rLat(latitude) : null;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="ocean" cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#1B3A6B" />
          <stop offset="100%" stopColor="#081326" />
        </radialGradient>
        <radialGradient id="aur" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="#2DD4BF" stopOpacity="0" />
          <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="url(#ocean)" stroke="#2a4a7a" />
      {[30, 45, 60, 75].map((l) => <circle key={l} cx={cx} cy={cy} r={rLat(l)} fill="none" stroke="#ffffff14" />)}
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + R * Math.cos((i * Math.PI) / 6)} y2={cy + R * Math.sin((i * Math.PI) / 6)} stroke="#ffffff0d" />
      ))}
      {ring !== null && (
        <>
          <circle cx={cx} cy={cy} r={ring} fill="url(#aur)" />
          <circle cx={cx} cy={cy} r={ring} fill="none" stroke="#2DD4BF" strokeWidth={3} strokeDasharray="2 5" strokeLinecap="round" />
        </>
      )}
      {cities.map((c) => {
        const rr = rLat(c.lat), a = (c.a * Math.PI) / 180;
        const px = cx + rr * Math.cos(a), py = cy + rr * Math.sin(a);
        const lit = latitude !== null && c.lat >= latitude;
        return (
          <g key={c.n}>
            <circle cx={px} cy={py} r={3.2} fill={lit ? "#2DD4BF" : "#8FA0C0"} />
            <text x={px + 6} y={py + 4} fontSize="10.5" fill={lit ? "#CFFAF3" : "#8FA0C0"}>{c.n}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={2.5} fill="#EEF3FB" />
    </svg>
  );
}

// ---------- carte thermique d'un siècle ----------
export function Heatmap({ cells, years, onPick, picked }: {
  cells: Map<string, { kp: number | null; strong: number; g5: number }>;
  years: number[];
  onPick?: (year: number) => void;
  picked?: number | null;
}) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<{ y: number; m: number } | null>(null);
  const m = { l: 30, r: 4, t: 4, b: 22 };
  const cw = years.length ? (width - m.l - m.r) / years.length : 0;
  const ch = 15;
  const height = m.t + 12 * ch + m.b;
  const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const hc = hover ? cells.get(`${hover.y}-${hover.m}`) : undefined;
  return (
    <div ref={ref} className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height}>
          {months.map((l, i) => (
            <text key={i} x={m.l - 8} y={m.t + i * ch + 11} textAnchor="end" fontSize="10" fill={COLORS.muted}>{l}</text>
          ))}
          {years.map((yr, yi) => (
            <g key={yr} onClick={() => onPick?.(yr)} style={{ cursor: onPick ? "pointer" : undefined }}>
              {months.map((_, mi) => {
                const c = cells.get(`${yr}-${mi + 1}`);
                return (
                  <rect key={mi} x={m.l + yi * cw + 0.5} y={m.t + mi * ch + 0.5} width={Math.max(cw - 1, 0.5)} height={ch - 1} rx={1.5}
                    fill={heatColor(c?.kp ?? null)}
                    opacity={picked && picked !== yr ? 0.35 : 1}
                    stroke={hover && hover.y === yr && hover.m === mi + 1 ? "#fff" : "none"}
                    onMouseEnter={() => setHover({ y: yr, m: mi + 1 })} />
                );
              })}
              {yr % 10 === 0 && (
                <text x={m.l + yi * cw} y={height - 6} fontSize="11" fill={COLORS.muted}>{yr}</text>
              )}
            </g>
          ))}
        </svg>
      )}
      {hover && (
        <Tooltip x={m.l + years.indexOf(hover.y) * cw} y={m.t + hover.m * ch} width={width}>
          <div className="text-muted">{new Date(Date.UTC(hover.y, hover.m - 1, 1)).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })}</div>
          <div className="mt-0.5 flex justify-between"><span className="text-muted">Kp maximal</span><span className="num font-semibold" style={{ color: kpColor(hc?.kp ?? null) }}>{fmt.kp(hc?.kp ?? null)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Jours G4 ou G5</span><span className="num font-semibold text-ink">{hc?.strong ?? 0}</span></div>
          {(hc?.g5 ?? 0) > 0 && <div className="text-[11px] text-flare">dont {hc?.g5} {(hc?.g5 ?? 0) > 1 ? "jours" : "jour"} G5</div>}
        </Tooltip>
      )}
    </div>
  );
}

// ---------- colonnes annuelles empilées ----------
export function YearColumns({ rows, height = 150, picked, onPick }: {
  rows: { year: number; a: number; b: number }[];
  height?: number;
  picked?: number | null;
  onPick?: (y: number) => void;
}) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { l: 30, r: 4, t: 6, b: 6 };
  const max = Math.max(1, ...rows.map((r) => r.a + r.b));
  const cw = rows.length ? (width - m.l - m.r) / rows.length : 0;
  const y = lin(0, max, height - m.b, m.t);
  const hr = hover !== null ? rows[hover] : null;
  return (
    <div ref={ref} className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height}>
          {niceTicks(0, max, 3).map((t) => (
            <g key={t}>
              <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke={COLORS.grid} />
              <text x={m.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill={COLORS.muted}>{t}</text>
            </g>
          ))}
          {rows.map((r, i) => (
            <g key={r.year} onMouseEnter={() => setHover(i)} onClick={() => onPick?.(r.year)} style={{ cursor: onPick ? "pointer" : undefined }}
              opacity={picked && picked !== r.year ? 0.35 : 1}>
              <rect x={m.l + i * cw} y={m.t} width={cw} height={height - m.t - m.b} fill="transparent" />
              <rect x={m.l + i * cw + 0.5} width={Math.max(cw - 1, 0.5)} y={y(r.a)} height={y(0) - y(r.a)} fill={COLORS.g3} rx={1} />
              <rect x={m.l + i * cw + 0.5} width={Math.max(cw - 1, 0.5)} y={y(r.a + r.b)} height={y(r.a) - y(r.a + r.b)} fill={COLORS.g5} rx={1} />
            </g>
          ))}
        </svg>
      )}
      {hr && (
        <Tooltip x={m.l + (hover as number) * cw} y={0} width={width}>
          <div className="font-semibold text-ink">{hr.year}</div>
          <div className="flex justify-between"><span className="text-muted">Jours G4</span><span className="num" style={{ color: COLORS.g3 }}>{hr.a}</span></div>
          <div className="flex justify-between"><span className="text-muted">Jours G5</span><span className="num" style={{ color: COLORS.g5 }}>{hr.b}</span></div>
        </Tooltip>
      )}
    </div>
  );
}

// ---------- nuage vitesse / trajet, avec la courbe balistique ----------
export interface CmePoint { id: string; v: number; h: number; kp: number | null; label: string }

export function CmeScatter({ points, selected, onSelect, height = 380, model }: {
  points: CmePoint[]; selected?: string | null; onSelect?: (id: string) => void; height?: number;
  /** Modèle empirique trajet = f(vitesse), tracé en trait plein. */
  model?: (v: number) => number;
}) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<CmePoint | null>(null);
  const m = { l: 50, r: 16, t: 12, b: 40 };
  const vmax = Math.max(2600, ...points.map((p) => p.v)) * 1.03;
  const hmax = Math.max(140, ...points.map((p) => p.h)) * 1.05;
  const x = lin(200, vmax, m.l, width - m.r);
  const y = lin(0, hmax, height - m.b, m.t);
  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let v = 300; v <= vmax; v += 20) {
      const h = ballisticHours(v);
      if (h <= hmax) pts.push(`${pts.length ? "L" : "M"}${x(v).toFixed(1)},${y(h).toFixed(1)}`);
    }
    return pts.join("");
  }, [vmax, hmax, width, height]); // eslint-disable-line react-hooks/exhaustive-deps
  const modelPath = useMemo(() => {
    if (!model) return "";
    const pts: string[] = [];
    for (let v = 300; v <= vmax; v += 20) {
      const h = model(v);
      if (h <= hmax) pts.push(`${pts.length ? "L" : "M"}${x(v).toFixed(1)},${y(h).toFixed(1)}`);
    }
    return pts.join("");
  }, [model, vmax, hmax, width, height]); // eslint-disable-line react-hooks/exhaustive-deps
  const kpR = (kp: number | null) => 4 + Math.max(0, (kp ?? 5) - 5) * 1.6;
  return (
    <div ref={ref} className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height}>
          {niceTicks(0, hmax, 5).map((t) => (
            <g key={t}>
              <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke={COLORS.grid} />
              <text x={m.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={COLORS.muted}>{t} h</text>
            </g>
          ))}
          {niceTicks(200, vmax, 6).map((t) => (
            <text key={t} x={x(t)} y={height - 20} textAnchor="middle" fontSize="11" fill={COLORS.muted}>{t.toLocaleString("fr-FR")}</text>
          ))}
          <text x={(m.l + width - m.r) / 2} y={height - 4} textAnchor="middle" fontSize="11" fill={COLORS.muted}>Vitesse au départ du Soleil (km/s)</text>
          <path d={curve} fill="none" stroke={COLORS.cyan} strokeWidth={2} strokeDasharray="6 5" />
          {model && <path d={modelPath} fill="none" stroke={COLORS.gold} strokeWidth={2.4} />}
          <g transform={`translate(${width - m.r - 220},${m.t + 6})`}>
            <line x1={0} x2={24} y1={0} y2={0} stroke={COLORS.cyan} strokeWidth={2} strokeDasharray="6 5" />
            <text x={30} y={4} fontSize="11" fill={COLORS.cyan}>trajet à vitesse constante</text>
            {model && (
              <>
                <line x1={0} x2={24} y1={18} y2={18} stroke={COLORS.gold} strokeWidth={2.4} />
                <text x={30} y={22} fontSize="11" fill={COLORS.gold}>modèle ajusté sur les données</text>
              </>
            )}
          </g>
          {points.map((p) => {
            const sel = selected === p.id;
            return (
              <circle key={p.id} cx={x(p.v)} cy={y(p.h)} r={sel ? kpR(p.kp) + 3 : kpR(p.kp)}
                fill={kpColor(p.kp)} fillOpacity={sel ? 1 : 0.75} stroke={sel ? "#fff" : "#04060d"} strokeWidth={sel ? 2 : 1}
                onMouseEnter={() => setHover(p)} onClick={() => onSelect?.(p.id)} style={{ cursor: "pointer" }} />
            );
          })}
        </svg>
      )}
      {hover && (
        <Tooltip x={x(hover.v)} y={y(hover.h)} width={width}>
          <div className="font-semibold text-ink">{hover.label}</div>
          <div className="flex justify-between"><span className="text-muted">Vitesse</span><span className="num text-ink">{fmt.int(hover.v)} km/s</span></div>
          <div className="flex justify-between"><span className="text-muted">Trajet observé</span><span className="num text-ink">{fmt.dec(hover.h)} h</span></div>
          <div className="flex justify-between"><span className="text-muted">À vitesse constante</span><span className="num text-aurora">{fmt.dec(ballisticHours(hover.v))} h</span></div>
          <div className="flex justify-between"><span className="text-muted">Kp de la tempête</span><span className="num" style={{ color: kpColor(hover.kp) }}>{fmt.kp(hover.kp)}</span></div>
        </Tooltip>
      )}
    </div>
  );
}

// ---------- couloir Soleil-Terre animé ----------
export function SunEarthLane({ transit, ballistic, speed, playKey }: { transit: number; ballistic: number; speed: number; playKey: string }) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const height = 160;
  const sx = 60, ex = Math.max(width - 70, 200);
  const start = sx + 46, stop = ex - 40; // du bord du Soleil au bord de la magnétosphère
  const slow = Math.max(transit, ballistic);
  const dObs = (4.5 * transit) / slow, dBal = (4.5 * ballistic) / slow; // durées d'animation proportionnelles aux trajets
  const lanes = [
    { y: 50, color: "#FF8A3D", label: `Trajet observé · ${fmt.dec(transit)} h`, dur: dObs },
    { y: 104, color: "#2DD4BF", label: `À vitesse constante (${fmt.int(speed)} km/s) · ${fmt.dec(ballistic)} h`, dur: dBal },
  ];
  return (
    <div ref={ref} className="relative mt-3 w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} key={playKey}>
          <defs>
            <radialGradient id="lane-sun" cx="40%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#FFE7A3" /><stop offset="50%" stopColor="#FFB04D" /><stop offset="100%" stopColor="#F2603A" />
            </radialGradient>
            <radialGradient id="lane-halo"><stop offset="0%" stopColor="#FF8A3D" stopOpacity="0.45" /><stop offset="100%" stopColor="#FF8A3D" stopOpacity="0" /></radialGradient>
            <radialGradient id="lane-earth" cx="35%" cy="35%" r="70%"><stop offset="0%" stopColor="#7CC4FF" /><stop offset="60%" stopColor="#2563EB" /><stop offset="100%" stopColor="#0B2A6B" /></radialGradient>
          </defs>
          <circle cx={sx} cy={77} r={66} fill="url(#lane-halo)" />
          <circle cx={sx} cy={77} r={32} fill="url(#lane-sun)" />
          {lanes.map((l) => (
            <g key={l.y}>
              <line x1={start} x2={stop} y1={l.y} y2={l.y} stroke={l.color} strokeOpacity={0.18} strokeWidth={6} strokeLinecap="round" />
              <line x1={start} x2={stop} y1={l.y} y2={l.y} stroke={l.color} strokeOpacity={0.9} strokeWidth={2} strokeLinecap="round" strokeDasharray={stop - start} strokeDashoffset={stop - start}>
                <animate attributeName="stroke-dashoffset" from={stop - start} to={0} dur={`${l.dur}s`} fill="freeze" />
              </line>
              <circle cy={l.y} r={5.5} fill={l.color}>
                <animate attributeName="cx" from={start} to={stop} dur={`${l.dur}s`} fill="freeze" />
              </circle>
              <circle cx={stop} cy={l.y} r={5} fill="none" stroke={l.color} opacity={0}>
                <animate attributeName="r" from={5} to={18} begin={`${l.dur}s`} dur="0.9s" fill="freeze" />
                <animate attributeName="opacity" values="0.9;0" begin={`${l.dur}s`} dur="0.9s" fill="freeze" />
              </circle>
              <text x={start} y={l.y - 12} fontSize="12" fontWeight={600} fill={l.color}>{l.label}</text>
            </g>
          ))}
          <path d={`M ${ex - 34} 20 Q ${ex - 62} 77 ${ex - 34} 134`} fill="none" stroke="#2DD4BF" strokeOpacity={0.55} strokeWidth={1.5} />
          <circle cx={ex} cy={77} r={15} fill="url(#lane-earth)" />
          <text x={ex} y={154} textAnchor="middle" fontSize="11" fill={COLORS.muted}>Terre</text>
          <text x={sx} y={154} textAnchor="middle" fontSize="11" fill={COLORS.muted}>Soleil</text>
        </svg>
      )}
      <div className="sr-only">Distance Soleil-Terre : {fmt.int(AU_KM)} km</div>
    </div>
  );
}
