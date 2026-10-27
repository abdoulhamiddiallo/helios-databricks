import { useMemo } from "react";
import { useDax, useDaxQuery, num, date, fmt } from "@/lib/helios-data";
import { kpColor, stormLevel, COLORS } from "@/lib/space";
import { KpBars } from "@/components/charts";
import { Loading, Failure } from "@/components/ui";

/** Requête DAX du Kp toutes les 3 heures, trois jours avant et trois jours après la date choisie. */
function stormDax(d: Date) {
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, j = d.getUTCDate();
  return `EVALUATE
VAR _jour = DATE(${y}, ${m}, ${j})
RETURN
SELECTCOLUMNS(
    FILTER(kp_3h, kp_3h[debut_tranche] >= _jour - 3 && kp_3h[debut_tranche] < _jour + 4),
    "debut", kp_3h[debut_tranche],
    "kp", kp_3h[kp]
)
ORDER BY [debut]`;
}

/** Anatomie d'une tempête : sa montée, son pic, sa retombée, et les éjections qui l'ont causée. */
export function StormAnatomy({ day, label }: { day: Date; label?: string }) {
  const key = `tempete:${day.toISOString().slice(0, 10)}`;
  const q = useDaxQuery(key, stormDax(day));
  const cme = useDax("cme");
  const pts = useMemo(() => q.rows.map((r) => ({ t: date(r.debut)!, kp: num(r.kp) ?? 0 })).filter((p) => p.t), [q.rows]);
  const peak = pts.length ? pts.reduce((a, b) => (a.kp >= b.kp ? a : b)) : null;
  const stormHours = pts.filter((p) => p.kp >= 4.66).length * 3;
  const first = pts.find((p) => p.kp >= 4.66);
  const causes = useMemo(() => {
    const t0 = day.getTime();
    return cme.rows
      .map((r) => ({ dep: date(r.depart), arr: date(r.arrivee), v: num(r.vitesse), tr: num(r.transit), id: String(r.cme) }))
      .filter((c) => c.arr && Math.abs(c.arr.getTime() - t0) < 2.5 * 86400e3)
      .filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i);
  }, [cme.rows, day]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="eyebrow">Anatomie d'une tempête</div>
          <div className="mt-1 text-[20px] font-semibold text-ink">{fmt.dayLong(day)}</div>
          {label && <div className="text-[12.5px] text-muted">{label}</div>}
        </div>
        {peak && (
          <div className="flex gap-6 text-right">
            <div><div className="text-[11px] uppercase tracking-[0.14em] text-dim">Pic</div><div className="num text-[22px] font-semibold" style={{ color: kpColor(peak.kp) }}>Kp {fmt.kp(peak.kp)}</div></div>
            <div><div className="text-[11px] uppercase tracking-[0.14em] text-dim">Classe</div><div className="text-[22px] font-semibold" style={{ color: kpColor(peak.kp) }}>{stormLevel(peak.kp).code}</div></div>
            <div><div className="text-[11px] uppercase tracking-[0.14em] text-dim">Durée en tempête</div><div className="num text-[22px] font-semibold text-ink">{stormHours} h</div></div>
          </div>
        )}
      </div>
      {q.loading ? <Loading height={200} /> : q.error ? <Failure message={q.error} /> : <KpBars points={pts} height={210} />}
      <div className="grid gap-3 @2xl:grid-cols-2">
        <div className="rounded-xl border border-edge p-3 text-[12.5px] text-muted">
          <span className="font-semibold text-ink">Déroulé. </span>
          {first && peak ? <>La tempête commence le {fmt.dateTime(first.t)}, atteint son pic le {fmt.dateTime(peak.t)} et reste au niveau G1 ou plus pendant {stormHours} heures sur la fenêtre de 7 jours.</> : "Pas de tranche en tempête sur la fenêtre."}
        </div>
        <div className="rounded-xl border border-edge p-3 text-[12.5px] text-muted">
          <span className="font-semibold text-ink">Causes identifiées par la NASA. </span>
          {day.getUTCFullYear() < 2010 ? "Le catalogue DONKI commence en 2010 : les causes de cette tempête ne sont pas cataloguées." :
            causes.length ? causes.map((c) => `${fmt.dayLong(c.dep)} à ${fmt.int(c.v)} km/s (${fmt.dec(c.tr)} h de trajet)`).join(" · ") : "Aucune éjection reliée dans le catalogue."}
        </div>
      </div>
      <div className="text-[11px] text-dim">Fenêtre de 7 jours centrée sur la journée · une barre par tranche de 3 heures · <span style={{ color: COLORS.g5 }}>rouge</span> au-delà de Kp 8.</div>
    </div>
  );
}
