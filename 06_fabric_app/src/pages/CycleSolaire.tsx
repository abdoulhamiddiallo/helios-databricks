import { useMemo, useState } from "react";
import { useDax, num, date, fmt } from "@/lib/helios-data";
import { COLORS } from "@/lib/space";
import { Panel, Stat, Loading, Failure, Legend } from "@/components/ui";
import { TimeChart, type TimeSeries } from "@/components/charts";
import { CycleOverlay, buildCycles } from "@/components/CycleOverlay";
import { useSize } from "@/hooks/use-size";

interface Cycle { n: number; debut: Date; fin: Date; g4: number; g5: number; tempete: number; taches: number | null; jours: number }

function EruptionBars({ rows }: { rows: { year: number; c: number; m: number; x: number }[] }) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const height = 250, ml = 44, mb = 24, mt = 8;
  const top = Math.max(1, ...rows.map((r) => r.c + r.m + r.x));
  const step = [50, 100, 200, 250, 500, 1000].find((s) => top / s <= 5) ?? 1000;
  const max = Math.ceil(top / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const bw = rows.length ? (width - ml - 8) / rows.length : 0;
  const y = (v: number) => height - mb - (v / max) * (height - mb - mt);
  const hr = hover !== null ? rows[hover] : null;
  return (
    <div ref={ref} className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={ml} x2={width - 8} y1={y(t)} y2={y(t)} stroke={COLORS.grid} />
              <text x={ml - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={COLORS.muted}>{fmt.int(t)}</text>
            </g>
          ))}
          {rows.map((r, i) => {
            const x = ml + i * bw + bw * 0.15, w = bw * 0.7;
            return (
              <g key={r.year} onMouseEnter={() => setHover(i)} opacity={hover === null || hover === i ? 1 : 0.5}>
                <rect x={x} width={w} y={y(r.c)} height={y(0) - y(r.c)} fill={COLORS.cyan} rx={2} />
                <rect x={x} width={w} y={y(r.c + r.m)} height={y(r.c) - y(r.c + r.m)} fill={COLORS.sun} />
                <rect x={x} width={w} y={y(r.c + r.m + r.x)} height={y(r.c + r.m) - y(r.c + r.m + r.x)} fill={COLORS.g5} rx={2} />
                <text x={x + w / 2} y={height - 6} textAnchor="middle" fontSize="10.5" fill={COLORS.muted}>{String(r.year).slice(2)}</text>
              </g>
            );
          })}
        </svg>
      )}
      {hr && (
        <div className="pointer-events-none absolute right-2 top-0 rounded-xl border border-edge bg-[#0b1324f2] px-3 py-2 text-[12px]">
          <div className="font-semibold text-ink">{hr.year}</div>
          <div className="text-aurora">Classe C : {fmt.int(hr.c)}</div>
          <div className="text-sun">Classe M : {fmt.int(hr.m)}</div>
          <div className="text-flare">Classe X : {fmt.int(hr.x)}</div>
        </div>
      )}
    </div>
  );
}

export default function CycleSolaire({ reload }: { reload: number }) {
  const spots = useDax("taches1749", reload);
  const cyc = useDax("cycles", reload);
  const eru = useDax("eruptions", reload);
  const kpi = useDax("chiffresCles", reload);

  const series: TimeSeries[] = useMemo(() => {
    const pts = spots.rows.map((r) => ({ t: date(r.mois)!, v: num(r.taches) })).filter((p) => p.t);
    // moyenne glissante sur 13 mois, la référence des astronomes pour dater les cycles
    const smooth = pts.map((p, i) => {
      const w = pts.slice(Math.max(0, i - 6), i + 7).map((q) => q.v).filter((v): v is number => v !== null);
      return { t: p.t, v: w.length >= 13 ? w.reduce((s, v) => s + v, 0) / w.length : null };
    });
    return [
      { name: "Taches par mois", color: "#FF8A3D55", points: pts, width: 1 },
      { name: "Moyenne sur 13 mois", color: COLORS.sun, points: smooth, width: 2.4, area: true },
    ];
  }, [spots.rows]);

  const record = useMemo(() => {
    const s = series[1]?.points.filter((p) => p.v !== null) ?? [];
    return s.length ? s.reduce((a, b) => ((a.v ?? 0) >= (b.v ?? 0) ? a : b)) : null;
  }, [series]);

  const cycles: Cycle[] = useMemo(
    () => cyc.rows.map((r) => ({
      n: num(r.cycle) as number, debut: date(r.debut)!, fin: date(r.fin)!, g4: num(r.g4) ?? 0, g5: num(r.g5) ?? 0,
      tempete: num(r.tempete) ?? 0, taches: num(r.taches), jours: num(r.jours) ?? 0,
    })),
    [cyc.rows],
  );
  const maxStrong = Math.max(1, ...cycles.map((c) => c.g4 + c.g5));
  const eruRows = useMemo(
    () => eru.rows.map((r) => ({ year: num(r.Annee) as number, c: num(r.c) ?? 0, m: num(r.m) ?? 0, x: num(r.x) ?? 0 })).filter((r) => r.c + r.m + r.x > 0),
    [eru.rows],
  );
  const overlay = useMemo(() => buildCycles(series[1]?.points ?? []), [series]);
  const compare = useMemo(() => {
    const c25 = overlay.find((c) => c.n === 25);
    if (!c25) return null;
    const now = c25.pts[c25.pts.length - 1];
    const peers = overlay.filter((c) => c.n !== 25).map((c) => ({ n: c.n, v: c.pts.reduce((a, b) => (Math.abs(b.age - now.age) < Math.abs(a.age - now.age) ? b : a)).v }));
    const avg = peers.reduce((s, p) => s + p.v, 0) / peers.length;
    const rank = 1 + peers.filter((p) => p.v > now.v).length;
    return { now, avg, rank, total: peers.length + 1 };
  }, [overlay]);
  const recordCycle = record ? cycles.find((c) => record.t >= c.debut && record.t < c.fin)?.n : undefined;
  const k = kpi.rows[0] ?? {};

  if (spots.error) return <Failure message={spots.error} />;

  return (
    <div className="grid gap-5">
      <Panel title="Le cœur battant du Soleil, depuis 1749"
        subtitle="Nombre de taches solaires chaque mois (série SILSO). Tous les 11 ans environ, le Soleil s'éveille puis s'endort : c'est le cycle solaire."
        right={<Legend items={[{ label: "Chaque mois", color: "#FF8A3D88" }, { label: "Moyenne sur 13 mois", color: COLORS.sun }]} />}>
        {spots.loading ? <Loading height={300} /> : <TimeChart series={series} height={300} digits={1} yMin={0} />}
        {record && (
          <div className="mt-2 text-[12.5px] text-muted">
            Record de la moyenne sur 13 mois : <span className="num font-semibold text-sun">{fmt.dec(record.v)}</span> taches en {record.t.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })}{recordCycle ? `, au sommet du cycle ${recordCycle}` : ""}.
          </div>
        )}
      </Panel>

      <div className="grid gap-5 @4xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Vingt-cinq cycles superposés" subtitle="Chaque courbe est un cycle, aligné sur son minimum de départ (moyenne sur 13 mois). Cycle 25 en orange, cycle 24 en turquoise, cycle 19 en or. Survolez une courbe.">
          {spots.loading ? <Loading height={340} /> : <CycleOverlay cycles={overlay} />}
        </Panel>
        <div className="grid content-start gap-5 @xl:grid-cols-3 @4xl:grid-cols-1">
          <Stat label="Âge du cycle 25" value={compare ? fmt.dec(compare.now.age) : "–"} unit="ans" hint="depuis le minimum de décembre 2019" color={COLORS.sun} />
          <Stat label="Taches, moyenne sur 13 mois" value={compare ? fmt.dec(compare.now.v) : "–"} hint={compare ? `moyenne des autres cycles au même âge : ${fmt.dec(compare.avg)}` : ""} color={COLORS.gold} />
          <Stat label="Rang au même âge" value={compare ? `${compare.rank}e` : "–"} unit={compare ? `sur ${compare.total}` : ""} hint="classement des cycles depuis 1755 à âge égal" color={COLORS.cyan} />
        </div>
      </div>

      <Panel data={cyc.rows} title="Dix cycles solaires sous la loupe" subtitle="Pour chaque cycle depuis 1923 : intensité moyenne et nombre de jours de tempête forte. Le cycle 16 n'est mesuré qu'à partir de 1932, le cycle 25 est en cours.">
        {cyc.loading ? <Loading /> : cyc.error ? <Failure message={cyc.error} /> : (
          <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-5">
            {cycles.map((c) => {
              const strong = c.g4 + c.g5;
              const partial = c.n === 16 || c.fin.getTime() > Date.now();
              return (
                <div key={c.n} className="relative overflow-hidden rounded-2xl border border-edge bg-panel-2/40 p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px] text-muted">Cycle</span>
                    <span className="text-[11px] text-dim">{c.debut.getUTCFullYear()}–{partial && c.n === 25 ? "…" : c.fin.getUTCFullYear()}</span>
                  </div>
                  <div className="num text-[30px] font-semibold text-ink">{c.n}</div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-edge">
                    <div className="h-1.5 rounded-full" style={{ width: `${(100 * strong) / maxStrong}%`, background: `linear-gradient(90deg, ${COLORS.g3}, ${COLORS.g5})` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-[12px]">
                    <span className="text-muted">G4 + G5</span>
                    <span className="num font-semibold text-ink">{strong}{c.g5 ? <span className="text-flare"> · {c.g5} G5</span> : null}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-muted">Taches / jour</span>
                    <span className="num text-sun">{fmt.dec(c.taches, 0)}</span>
                  </div>
                  {partial && <div className="mt-1 text-[10.5px] text-dim">{c.n === 25 ? "en cours" : "mesuré en partie"}</div>}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="grid gap-5 @4xl:grid-cols-[1.5fr_1fr]">
        <Panel data={eruRows} title="Éruptions solaires par année" subtitle="Classes C, M et X : chaque lettre est dix fois plus puissante que la précédente"
          right={<Legend items={[{ label: "C", color: COLORS.cyan }, { label: "M", color: COLORS.sun }, { label: "X", color: COLORS.g5 }]} />}>
          {eru.loading ? <Loading height={250} /> : <EruptionBars rows={eruRows} />}
        </Panel>
        <div className="grid content-start gap-5 @xl:grid-cols-2 @4xl:grid-cols-1">
          <Stat label="Éruptions recensées depuis 2010" value={fmt.int(num(k.eruptions))} hint="catalogue NASA DONKI" color={COLORS.sun} />
          <Stat label="Éruptions de classe X" value={fmt.int(num(k.eruptionsX))} hint="les plus puissantes : perturbent la radio en quelques minutes" color={COLORS.g5} />
        </div>
      </div>
    </div>
  );
}
