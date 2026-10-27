import { useMemo, useState } from "react";
import { useDax, num, date, fmt } from "@/lib/helios-data";
import { COLORS, CME_TYPES, kpColor, stormLevel, ballisticHours } from "@/lib/space";
import { Panel, Stat, Loading, Failure, Chip } from "@/components/ui";
import { CmeScatter, SunEarthLane, type CmePoint } from "@/components/charts";

interface Cme {
  id: string; gst: string; cme: string; depart: Date; arrivee: Date; kp: number | null; v: number; type: string;
  position: string; region: number | null; transit: number; balistique: number; ecart: number; lien: string;
  /** Vitesse moyenne réelle du trajet, déduite de la durée observée. */
  vMoy: number;
  /** Lien jugé physiquement douteux : trajet plus rapide qu'1,6 fois la vitesse de départ. */
  douteux: boolean;
}

/** Ajuste trajet = a × vitesse^b (régression log-log), le modèle empirique tiré des données. */
function fitPower(list: { v: number; h: number }[]) {
  const pts = list.filter((p) => p.v > 0 && p.h > 0).map((p) => [Math.log(p.v), Math.log(p.h)]);
  const n = pts.length;
  if (n < 5) return null;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
  const b = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
  const a = Math.exp(my - b * mx);
  const res = pts.map((p) => p[1] - (Math.log(a) + b * p[0]));
  const sd = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / (n - 2));
  return { a, b, sd, predict: (v: number) => a * Math.pow(v, b) };
}

const AU = 149597870.7;
const hm = (h: number) => `${Math.floor(h / 24)} j ${Math.round(h % 24)} h`;

type Sort = "recent" | "rapide" | "kp";

export default function SoleilTerre({ reload }: { reload: number }) {
  const q = useDax("cme", reload);
  const kpi = useDax("chiffresCles", reload);
  const [sel, setSel] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("kp");
  const [type, setType] = useState<string | null>(null);
  const [simV, setSimV] = useState(1200);

  const cmes: Cme[] = useMemo(
    () =>
      q.rows
        .map((r) => ({
          id: `${r.gst}|${r.cme}`, gst: String(r.gst), cme: String(r.cme), depart: date(r.depart)!, arrivee: date(r.arrivee)!,
          kp: num(r.kpMax), v: num(r.vitesse) ?? 0, type: String(r.type ?? "?"), position: String(r.position ?? ""),
          region: num(r.region), transit: num(r.transit) ?? 0, balistique: num(r.balistique) ?? 0, ecart: num(r.ecart) ?? 0, lien: String(r.lien ?? ""),
          vMoy: 0, douteux: false,
        }))
        .filter((c) => c.v > 0 && c.transit > 0 && c.depart)
        .map((c) => {
          const vMoy = AU / (c.transit * 3600);
          return { ...c, vMoy, douteux: vMoy > 1.6 * c.v };
        }),
    [q.rows],
  );

  const shown = useMemo(() => {
    const list = cmes.filter((c) => !type || c.type === type);
    const sorters: Record<Sort, (a: Cme, b: Cme) => number> = {
      recent: (a, b) => b.depart.getTime() - a.depart.getTime(),
      rapide: (a, b) => a.transit - b.transit,
      kp: (a, b) => (b.kp ?? 0) - (a.kp ?? 0) || b.v - a.v,
    };
    return [...list].sort(sorters[sort]);
  }, [cmes, sort, type]);

  const current = cmes.find((c) => c.id === sel) ?? shown[0];
  const fiables = useMemo(() => cmes.filter((c) => !c.douteux), [cmes]);
  const ecartes = cmes.length - fiables.length;
  const points: CmePoint[] = useMemo(
    () => fiables.filter((c) => !type || c.type === type).map((c) => ({ id: c.id, v: c.v, h: c.transit, kp: c.kp, label: fmt.dayLong(c.depart) })),
    [fiables, type],
  );
  const model = useMemo(() => fitPower(fiables.map((c) => ({ v: c.v, h: c.transit }))), [fiables]);
  const stats = useMemo(() => {
    if (!fiables.length) return null;
    const mean = (f: (c: Cme) => number) => fiables.reduce((s, c) => s + f(c), 0) / fiables.length;
    const fastest = fiables.reduce((a, b) => (a.transit <= b.transit ? a : b));
    return { transit: mean((c) => c.transit), ecart: mean((c) => c.ecart), v: mean((c) => c.v), fastest };
  }, [fiables]);
  const analogues = useMemo(
    () => [...fiables].sort((a, b) => Math.abs(a.v - simV) - Math.abs(b.v - simV)).slice(0, 3),
    [fiables, simV],
  );
  const k = kpi.rows[0] ?? {};
  const tm = stats?.transit ?? null;
  const tmText = tm === null ? "" : `du Soleil à la Terre, soit ${Math.floor(tm / 24)} j ${Math.round(tm % 24)} h`;
  const fastest = stats?.fastest ?? null;
  const simModel = model ? model.predict(simV) : null;
  const simBal = ballisticHours(simV);
  const types = Array.from(new Set(cmes.map((c) => c.type))).sort((a, b) => "SCORE".indexOf(a[0]) - "SCORE".indexOf(b[0]));

  if (q.error) return <Failure message={q.error} />;

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-5 @3xl:grid-cols-4">
        <Stat label="Éjections arrivées" value={fmt.int(num(k.cme))} hint={`sur Terre depuis 2010 · ${fmt.int(num(k.tempetesReliees))} tempêtes`} color={COLORS.sun} />
        <Stat label="Trajet moyen" value={fmt.dec(tm)} unit="heures" hint={tmText} color={COLORS.cyan} />
        <Stat label="Trajet le plus court" value={fmt.dec(fastest?.transit ?? null)} unit="heures" hint={fastest ? `le ${fmt.dayLong(fastest.depart)}, à ${fmt.int(fastest.v)} km/s` : ""} color={COLORS.g5} />
        <Stat label="Retard moyen" value={fmt.signed(stats?.ecart ?? null)} unit="heures" hint="sur le trajet à vitesse constante" color={COLORS.violet} />
      </div>

      {current && (
        <Panel className="overflow-hidden">
          <div className="grid gap-6 @3xl:grid-cols-[1fr_340px]">
            <div>
              <div className="eyebrow">Voyage d'une éjection de masse coronale</div>
              <h2 className="mt-1 text-[22px] font-semibold text-ink">
                Partie le {fmt.dayLong(current.depart)}, arrivée en {fmt.dec(current.transit)} h
              </h2>
              <SunEarthLane transit={current.transit} ballistic={current.balistique} speed={current.v} playKey={current.id} />
            </div>
            <div className="grid content-start gap-2 text-[13px]">
              <div className="flex justify-between border-b border-edge pb-2"><span className="text-muted">Vitesse au départ</span><span className="num font-semibold text-ink">{fmt.int(current.v)} km/s</span></div>
              <div className="flex justify-between border-b border-edge pb-2"><span className="text-muted">Type</span><span className="text-ink">{current.type} · {CME_TYPES[current.type]?.split(" · ")[0] ?? "–"}</span></div>
              <div className="flex justify-between border-b border-edge pb-2"><span className="text-muted">Région source</span><span className="num text-ink">{current.position || "–"}{current.region ? ` · AR ${current.region}` : ""}</span></div>
              <div className="flex justify-between border-b border-edge pb-2"><span className="text-muted">Début de la tempête</span><span className="num text-ink">{fmt.dateTime(current.arrivee)}</span></div>
              <div className="flex justify-between border-b border-edge pb-2"><span className="text-muted">Kp maximal</span><span className="num font-semibold" style={{ color: kpColor(current.kp) }}>Kp {fmt.kp(current.kp)} · {stormLevel(current.kp).code}</span></div>
              <div className="flex justify-between border-b border-edge pb-2"><span className="text-muted">Écart au calcul balistique</span><span className="num text-ink">{fmt.signed(current.ecart)} h</span></div>
              {current.lien && (
                <a href={current.lien} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-aurora hover:underline">Fiche NASA DONKI ↗</a>
              )}
            </div>
          </div>
        </Panel>
      )}

      <div className="grid gap-5 @4xl:grid-cols-[1.4fr_1fr]">
        <Panel data={fiables.map((c) => ({ depart: c.depart.toISOString(), cme: c.cme, tempete: c.gst, vitesse_kms: c.v, trajet_h: c.transit, balistique_h: c.balistique, kp_max: c.kp, type: c.type }))} title="Plus une CME est rapide, plus elle frappe vite" subtitle="Un point par éjection, coloré selon la force de la tempête ; en pointillés, le trajet théorique à vitesse constante. Cliquez un point pour suivre son voyage."
          right={<div className="flex flex-wrap justify-end gap-1.5"><Chip active={!type} onClick={() => setType(null)}>Toutes</Chip>{types.map((t) => <Chip key={t} active={type === t} onClick={() => setType(t)}>{t}</Chip>)}</div>}>
          {q.loading ? <Loading height={400} /> : <CmeScatter points={points} selected={current?.id} onSelect={setSel} height={400} model={model?.predict} />}
          <div className="mt-2 text-[12px] leading-relaxed text-dim">
            Au-dessus de la courbe turquoise, la CME a été freinée par le vent solaire ; en dessous, elle a été poussée.
            {model && <> Le modèle doré, ajusté sur {fiables.length} trajets, suit la loi trajet ≈ {fmt.int(model.a)} × vitesse<sup>{fmt.dec(model.b, 2)}</sup>.</>}
            {ecartes > 0 && <> {ecartes === 1 ? "Un lien a été écarté" : `${ecartes} liens ont été écartés`} des calculs : la durée observée impliquerait une vitesse moyenne supérieure à 1,6 fois la vitesse de départ, signe qu'une autre éjection a causé la tempête.</>}
          </div>
        </Panel>
        <Panel title="Les éjections une par une" subtitle={`${shown.length} liens CME → tempête`}
          right={<div className="flex gap-1.5"><Chip active={sort === "kp"} onClick={() => setSort("kp")}>Plus fortes</Chip><Chip active={sort === "rapide"} onClick={() => setSort("rapide")}>Plus rapides</Chip><Chip active={sort === "recent"} onClick={() => setSort("recent")}>Récentes</Chip></div>}>
          <div className="max-h-[430px] overflow-y-auto pr-1">
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0 bg-panel text-left text-dim">
                <tr><th className="py-2 font-medium">Départ</th><th className="font-medium">Vitesse</th><th className="font-medium">Trajet</th><th className="text-right font-medium">Kp</th></tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id} onClick={() => setSel(c.id)}
                    className={`cursor-pointer border-t border-edge transition hover:bg-panel-2 ${current?.id === c.id ? "bg-panel-2" : ""}`}>
                    <td className="py-2 text-ink">{fmt.dayLong(c.depart)}{c.douteux && <span title="Lien écarté des calculs : trajet trop rapide pour cette vitesse" className="ml-2 rounded bg-gold/15 px-1.5 py-0.5 text-[10.5px] text-gold">douteux</span>}</td>
                    <td className="num text-muted">{fmt.int(c.v)} km/s</td>
                    <td className="num text-muted">{fmt.dec(c.transit)} h</td>
                    <td className="num text-right font-semibold" style={{ color: kpColor(c.kp) }}>{fmt.kp(c.kp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <Panel title="Simulateur d'arrivée" subtitle="Une éjection quitte le Soleil : réglez sa vitesse et voyez quand elle frappera la Terre, selon la physique simple et selon les trajets réellement observés.">
        <div className="grid gap-6 @3xl:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-muted">Vitesse au départ du Soleil</span>
              <span className="num text-[28px] font-semibold text-sun">{fmt.int(simV)} <span className="text-[14px] text-muted">km/s</span></span>
            </div>
            <input type="range" min={300} max={3000} step={10} value={simV} onChange={(e) => setSimV(Number(e.target.value))}
              className="mt-3 w-full accent-[#FF8A3D]" aria-label="Vitesse de la CME" />
            <div className="mt-1 flex justify-between text-[11px] text-dim"><span>300 km/s · lente</span><span>3 000 km/s · extrême</span></div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-edge p-4">
                <div className="text-[12px] text-muted">À vitesse constante</div>
                <div className="num text-[26px] font-semibold text-aurora">{fmt.dec(simBal)} h</div>
                <div className="text-[12px] text-dim">{hm(simBal)}</div>
              </div>
              <div className="rounded-2xl border border-gold/40 bg-gold/5 p-4">
                <div className="text-[12px] text-muted">Selon les trajets observés</div>
                <div className="num text-[26px] font-semibold text-gold">{simModel ? `${fmt.dec(simModel)} h` : "–"}</div>
                <div className="text-[12px] text-dim">
                  {simModel && model ? `${hm(simModel)} · entre ${fmt.dec(simModel * Math.exp(-model.sd))} et ${fmt.dec(simModel * Math.exp(model.sd))} h` : ""}
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="mb-2 text-[12.5px] text-muted">Les trois éjections réelles les plus proches de cette vitesse</div>
            <div className="grid gap-2">
              {analogues.map((c) => (
                <button key={c.id} onClick={() => setSel(c.id)} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-edge px-4 py-3 text-left transition hover:border-sun">
                  <div>
                    <div className="text-[14px] font-semibold text-ink">{fmt.dayLong(c.depart)}</div>
                    <div className="num text-[12px] text-muted">{fmt.int(c.v)} km/s · arrivée en {fmt.dec(c.transit)} h</div>
                  </div>
                  <div className="num text-right text-[15px] font-semibold" style={{ color: kpColor(c.kp) }}>Kp {fmt.kp(c.kp)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
