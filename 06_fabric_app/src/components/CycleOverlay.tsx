import { useMemo, useState } from "react";
import { useSize } from "@/hooks/use-size";
import { COLORS, CYCLE_MINIMA } from "@/lib/space";
import { fmt } from "@/lib/helios-data";

export interface CycleCurve { n: number; pts: { age: number; v: number }[] }

/** Découpe la série mensuelle lissée en cycles alignés sur leur minimum de départ. */
export function buildCycles(series: { t: Date; v: number | null }[]): CycleCurve[] {
  const byMonth = new Map(series.filter((p) => p.v !== null).map((p) => [p.t.getUTCFullYear() * 12 + p.t.getUTCMonth(), p.v as number]));
  return CYCLE_MINIMA.map(([n, y, m], i) => {
    const start = y * 12 + (m - 1);
    const next = CYCLE_MINIMA[i + 1];
    const end = next ? next[1] * 12 + (next[2] - 1) : start + 13 * 12;
    const pts: { age: number; v: number }[] = [];
    for (let k = start; k <= end; k++) {
      const v = byMonth.get(k);
      if (v !== undefined) pts.push({ age: (k - start) / 12, v });
    }
    return { n, pts };
  }).filter((c) => c.pts.length > 12);
}

const HIGHLIGHT: Record<number, string> = { 25: COLORS.sun, 24: COLORS.cyan, 19: COLORS.gold };

export function CycleOverlay({ cycles, height = 340 }: { cycles: CycleCurve[]; height?: number }) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { l: 44, r: 16, t: 10, b: 30 };
  const vmax = Math.max(50, ...cycles.flatMap((c) => c.pts.map((p) => p.v))) * 1.05;
  const x = (a: number) => m.l + (a / 14) * (width - m.l - m.r);
  const y = (v: number) => height - m.b - (v / vmax) * (height - m.t - m.b);
  const path = (c: CycleCurve) => c.pts.map((p, i) => `${i ? "L" : "M"}${x(p.age).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const order = useMemo(() => [...cycles].sort((a, b) => (HIGHLIGHT[a.n] ? 1 : 0) - (HIGHLIGHT[b.n] ? 1 : 0)), [cycles]);
  const hc = cycles.find((c) => c.n === hover);
  const peak = hc ? hc.pts.reduce((a, b) => (a.v >= b.v ? a : b)) : null;
  return (
    <div ref={ref} className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height}>
          {[0, 100, 200, 300].filter((v) => v < vmax).map((v) => (
            <g key={v}>
              <line x1={m.l} x2={width - m.r} y1={y(v)} y2={y(v)} stroke={COLORS.grid} />
              <text x={m.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={COLORS.muted}>{v}</text>
            </g>
          ))}
          {[0, 2, 4, 6, 8, 10, 12, 14].map((a) => (
            <text key={a} x={x(a)} y={height - 10} textAnchor="middle" fontSize="11" fill={COLORS.muted}>{a} ans</text>
          ))}
          {order.map((c) => {
            const hl = HIGHLIGHT[c.n];
            const on = hover === c.n;
            return (
              <path key={c.n} d={path(c)} fill="none"
                stroke={on ? "#fff" : hl ?? "#5B6B8A"} strokeOpacity={on || hl ? 1 : hover ? 0.15 : 0.35}
                strokeWidth={on ? 2.6 : hl ? (c.n === 25 ? 3.2 : 2.2) : 1.2}
                onMouseEnter={() => setHover(c.n)} style={{ cursor: "pointer" }} />
            );
          })}
          {cycles.filter((c) => c.n === 25).map((c) => {
            const p = c.pts[c.pts.length - 1];
            return (
              <g key="now">
                <circle cx={x(p.age)} cy={y(p.v)} r={5} fill={COLORS.sun} stroke="#04060d" strokeWidth={2} />
                <text x={x(p.age) + 9} y={y(p.v) - 8} fontSize="11.5" fill={COLORS.sun}>cycle 25, aujourd'hui</text>
              </g>
            );
          })}
        </svg>
      )}
      {hc && peak && (
        <div className="pointer-events-none absolute right-3 top-2 rounded-xl border border-edge bg-[#0b1324f2] px-3 py-2 text-[12px]">
          <div className="font-semibold text-ink">Cycle {hc.n}</div>
          <div className="text-muted">sommet : <span className="num text-ink">{fmt.dec(peak.v)}</span> taches, {fmt.dec(peak.age)} ans après le minimum</div>
        </div>
      )}
    </div>
  );
}
