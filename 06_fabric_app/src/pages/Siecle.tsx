import { useMemo, useState } from "react";
import { useDax, num, date, fmt } from "@/lib/helios-data";
import { COLORS, heatColor, kpColor } from "@/lib/space";
import { Panel, Stat, Loading, Failure, Chip } from "@/components/ui";
import { Heatmap, YearColumns, TimeChart } from "@/components/charts";
import { StormAnatomy } from "@/components/StormAnatomy";

const EVENTS: Record<string, string> = {
  "1960-11-13": "Journée la plus perturbée depuis 1932 selon l'indice Ap",
  "2024-05-11": "Tempête de la Fête des Mères : aurores jusqu'au Mexique",
  "1989-03-13": "Panne géante d'Hydro-Québec : 6 millions de personnes privées d'électricité",
  "2003-10-29": "Tempêtes d'Halloween : satellites endommagés",
  "1941-07-05": "Cycle 17, l'un des plus violents",
  "1959-07-15": "Cycle 19, le plus puissant jamais mesuré",
};

export default function Siecle({ reload }: { reload: number }) {
  const heat = useDax("carteThermique", reload);
  const years = useDax("annees", reload);
  const top = useDax("topJournees", reload);
  const kpi = useDax("chiffresCles", reload);
  const [picked, setPicked] = useState<number | null>(null);
  const [storm, setStorm] = useState<string | null>(null);

  const cells = useMemo(() => {
    const m = new Map<string, { kp: number | null; strong: number; g5: number }>();
    heat.rows.forEach((r) => m.set(`${r.Annee}-${r.NoMois}`, { kp: num(r.kpMax), strong: num(r.joursForts) ?? 0, g5: num(r.joursG5) ?? 0 }));
    return m;
  }, [heat.rows]);
  const yearList = useMemo(() => {
    const ys = years.rows.map((r) => num(r.Annee)).filter((y): y is number => y !== null && y >= 1932);
    return ys.length ? ys : Array.from(new Set(heat.rows.map((r) => num(r.Annee) as number))).sort();
  }, [years.rows, heat.rows]);
  const cols = useMemo(
    () => years.rows.map((r) => ({ year: num(r.Annee) as number, a: num(r.g4) ?? 0, b: num(r.g5) ?? 0 })).filter((r) => r.year >= 1932),
    [years.rows],
  );
  const sunspots = useMemo(
    () => years.rows.map((r) => ({ t: new Date(Date.UTC(num(r.Annee) as number, 6, 1)), v: num(r.taches) })).filter((p) => p.v !== null),
    [years.rows],
  );
  const pickedRow = picked ? years.rows.find((r) => num(r.Annee) === picked) : null;
  const k = kpi.rows[0] ?? {};
  const stormDefault = top.rows[0] ? (date(top.rows[0].jour)?.toISOString().slice(0, 10) ?? null) : null;
  const stormKey = storm ?? stormDefault;

  if (heat.error) return <Failure message={heat.error} />;

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-5 @3xl:grid-cols-4">
        <Stat label="Jours mesurés" value={fmt.int(num(k.joursObserves))} hint="depuis 1932, sans interruption" color={COLORS.ink} />
        <Stat label="Jours de tempête" value={fmt.int(num(k.joursTempete))} hint={k.joursObserves ? `G1 à G5 · ${fmt.dec((100 * (num(k.joursTempete) ?? 0)) / (num(k.joursObserves) ?? 1))} % des jours` : "G1 à G5"} color={COLORS.g1} />
        <Stat label="Tempête sévère (G4)" value={fmt.int(num(k.joursG4))} hint="jours à Kp de 8- à 8+" color={COLORS.g3} />
        <Stat tint label="Tempête extrême (G5)" value={fmt.int(num(k.joursG5))} hint="jours à Kp 9, le maximum" color={COLORS.g5} />
      </div>

      <Panel data={years.rows.map((r) => ({ annee: r.Annee, jours_tempete: r.tempete, jours_g4: r.g4 ?? 0, jours_g5: r.g5 ?? 0, taches_solaires: r.taches, ap_moyen: r.apMoyen }))} title="Un siècle d'orages magnétiques, mois par mois"
        subtitle="Chaque case est un mois, coloré selon le Kp le plus fort atteint. Les bandes chaudes reviennent tous les 11 ans environ : c'est le cycle solaire. Cliquez une année."
        right={picked ? <Chip active onClick={() => setPicked(null)}>{picked} ✕</Chip> : (
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span>Kp 0</span>
            <span className="h-2.5 w-40 rounded-full" style={{ background: `linear-gradient(90deg, ${[0, 3, 4.66, 5.66, 6.66, 7.66, 8.67, 9].map((k) => heatColor(k)).join(",")})` }} />
            <span>9</span>
          </div>
        )}>
        {heat.loading ? <Loading height={210} /> : (
          <>
            <Heatmap cells={cells} years={yearList} picked={picked} onPick={(y) => setPicked(picked === y ? null : y)} />
            <div className="mt-3"><div className="mb-1 text-[11.5px] text-muted">Jours de tempête sévère (orange) et extrême (rouge) par année</div>
              <YearColumns rows={cols} height={110} picked={picked} onPick={(y) => setPicked(picked === y ? null : y)} />
            </div>
          </>
        )}
      </Panel>

      <div className="grid gap-5 @4xl:grid-cols-[1fr_1.1fr]">
        <Panel title={picked ? `L'année ${picked}` : "Le Soleil bat la mesure"}
          subtitle={picked ? "Activité de l'année sélectionnée" : "Taches solaires moyennes par année : chaque vague est un cycle solaire"}>
          {picked && pickedRow ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Jours de tempête", fmt.int(num(pickedRow.tempete)), COLORS.g1],
                ["Jours G4", fmt.int(num(pickedRow.g4) ?? 0), COLORS.g3],
                ["Jours G5", fmt.int(num(pickedRow.g5) ?? 0), COLORS.g5],
                ["Taches solaires (moyenne)", fmt.dec(num(pickedRow.taches)), COLORS.sun],
                ["Indice Ap moyen", fmt.dec(num(pickedRow.apMoyen)), COLORS.cyan],
              ].map(([l, v, c]) => (
                <div key={l} className="rounded-xl border border-edge px-4 py-3">
                  <div className="text-[12px] text-muted">{l}</div>
                  <div className="num text-[24px] font-semibold" style={{ color: c }}>{v}</div>
                </div>
              ))}
            </div>
          ) : years.loading ? <Loading /> : (
            <TimeChart series={[{ name: "Taches solaires", color: COLORS.sun, points: sunspots, area: true }]} height={480} yMin={0} />
          )}
        </Panel>
        <Panel data={top.rows} title="Les journées les plus agitées depuis 1932" subtitle="Classées par indice Ap, qui mesure la violence de la perturbation sur toute la journée. Cliquez une journée pour voir son anatomie.">
          {top.loading ? <Loading /> : (
            <ol className="grid gap-1.5">
              {top.rows.slice(0, 10).map((r, i) => {
                const d = date(r.jour);
                const key = d ? d.toISOString().slice(0, 10) : "";
                return (
                  <li key={key} onClick={() => setStorm(key)} title="Voir l'anatomie de cette tempête"
                    className={`grid cursor-pointer grid-cols-[28px_1fr_auto] items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-panel-2 ${(storm ?? stormDefault) === key ? "bg-panel-2 ring-1 ring-sun/50" : ""}`}>
                    <span className="num text-[13px] text-dim">{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-ink">{fmt.dayLong(d)}</div>
                      <div className="truncate text-[12px] text-muted">{EVENTS[key] ?? `Cycle ${r.cycle} · ${fmt.int(num(r.taches))} taches solaires ce jour-là`}</div>
                    </div>
                    <div className="text-right">
                      <div className="num text-[16px] font-semibold" style={{ color: kpColor(num(r.kpMax)) }}>Ap {fmt.int(num(r.ap))}</div>
                      <div className="text-[11px] text-dim">Kp {fmt.kp(num(r.kpMax))} · {String(r.classe)}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </div>
      {stormKey && (
        <Panel title="" className="">
          <StormAnatomy day={new Date(stormKey + "T00:00:00Z")} label={EVENTS[stormKey] ?? "Cliquez une autre journée du classement pour l'explorer."} />
        </Panel>
      )}
    </div>
  );
}
