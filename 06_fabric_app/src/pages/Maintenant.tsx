import { useMemo } from "react";
import { useDax, num, date, fmt } from "@/lib/helios-data";
import { stormLevel, auroraLatitude, COLORS } from "@/lib/space";
import { Panel, Stat, Loading, Failure } from "@/components/ui";
import { KpGauge, KpBars, AuroraGlobe, TimeChart } from "@/components/charts";
import { MagnetosphereScene, shue } from "@/components/Magnetosphere";

export default function Maintenant({ reload }: { reload: number }) {
  const now = useDax("maintenant", reload);
  const kp7 = useDax("kpSemaine", reload);
  const vent = useDax("ventHoraire", reload);

  const r = now.rows[0] ?? {};
  const kp = num(r.kp);
  const level = stormLevel(kp);
  const lat = auroraLatitude(num(r.kpMax24h) ?? kp);
  const bz = num(r.bz);
  const vitesse = num(r.vitesse);

  const kpPoints = useMemo(
    () => kp7.rows.map((x) => ({ t: date(x.debut)!, kp: num(x.kp) ?? 0 })).filter((p) => p.t),
    [kp7.rows],
  );
  const ventSeries = useMemo(() => vent.rows.map((x) => ({ t: date(x.heure)!, v: num(x.vitesse) })), [vent.rows]);
  const bzSeries = useMemo(() => vent.rows.map((x) => ({ t: date(x.heure)!, v: num(x.bz) })), [vent.rows]);

  const verdict = (() => {
    if (kp === null) return "";
    const parts: string[] = [];
    parts.push(vitesse !== null ? (vitesse >= 600 ? "un vent solaire rapide" : vitesse >= 450 ? "un vent solaire soutenu" : "un vent solaire lent") : "");
    parts.push(bz !== null ? (bz <= -10 ? "un champ magnétique fortement orienté au sud" : bz < 0 ? "un champ légèrement orienté au sud" : "un champ orienté au nord, qui referme la porte") : "");
    return `La Terre reçoit ${parts.filter(Boolean).join(" et ")}.`;
  })();

  if (now.error) return <Failure message={now.error} />;

  const pression = num(r.pression);
  const mp = bz !== null && pression !== null ? shue(bz, pression) : null;
  const geoExposed = mp ? mp.r0 < 6.6 : false;
  const delaiMin = vitesse ? 1.5e6 / vitesse / 60 : null;
  const kp24 = num(r.kpMax24h) ?? kp ?? 0;
  const risk = (lvl: number) => [
    { t: "Faible", c: COLORS.calm }, { t: "Modéré", c: COLORS.g1 }, { t: "Élevé", c: COLORS.g3 }, { t: "Critique", c: COLORS.g5 },
  ][lvl];
  const lvlKp = kp24 >= 7.66 ? 3 : kp24 >= 6.66 ? 2 : kp24 >= 4.66 ? 1 : 0;
  const risks = [
    { k: "Réseaux électriques", d: "courants induits dans les lignes à haute tension", l: lvlKp },
    { k: "Satellites", d: mp ? `magnétopause à ${fmt.dec(mp.r0)} rayons terrestres` : "position de la magnétopause", l: geoExposed ? 3 : mp && mp.r0 < 8 ? 2 : lvlKp >= 2 ? 1 : 0 },
    { k: "GPS et radio HF", d: "scintillations dans l'ionosphère", l: Math.min(3, lvlKp + (bz !== null && bz <= -10 ? 1 : 0)) },
    { k: "Aurores en France", d: lat !== null ? `visibles jusqu'à ${fmt.dec(lat, 0)}° de latitude` : "", l: kp24 >= 8 ? 3 : kp24 >= 7 ? 2 : kp24 >= 6 ? 1 : 0 },
  ];

  return (
    <div className="grid gap-5">
      <section className="panel rise hud relative overflow-hidden px-5 py-4">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <div className="font-mono text-[11px] tracking-[0.18em] text-steel">BULLETIN HÉLIOS · {fmt.dateTime(date(r.heure)).toUpperCase()}</div>
            <div className="text-[14px] text-ink">{level.label} · vent {vitesse !== null ? fmt.int(vitesse) : "–"} km/s · Bz {fmt.signed(bz)} nT</div>
          </div>
          <div className="grid grid-cols-1 gap-2 @xl:grid-cols-2 @5xl:grid-cols-4">
            {risks.map((x) => {
              const rk = risk(x.l);
              return (
                <div key={x.k} className="rounded-xl border border-edge bg-panel-2/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-ink">{x.k}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: rk.c }}>
                      <span className="flex gap-0.5">{[0, 1, 2, 3].map((i) => <span key={i} className="h-2.5 w-1.5 rounded-sm" style={{ background: i <= x.l ? rk.c : "#1a2640" }} />)}</span>
                      {rk.t}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11.5px] leading-snug text-dim">{x.d}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Panel className="overflow-hidden !p-0">
        <div className="grid @4xl:grid-cols-[1fr_320px]">
          <div className="relative">
            {now.loading ? <Loading height={400} /> : (
              <MagnetosphereScene speed={vitesse ?? 400} bz={bz ?? 0} pressure={pression ?? 1} kp={kp ?? 0} height={400} />
            )}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#04060df0] via-[#04060d99] to-transparent" />
            <div className="pointer-events-none absolute left-4 top-4 max-w-[min(560px,calc(100%-2rem))] rounded-xl border border-white/5 bg-[#04060dcc] px-4 py-3 backdrop-blur-sm">
              <div className="eyebrow">Simulation à partir des mesures</div>
              <div className="mt-1 text-[20px] font-semibold text-ink">Le bouclier de la Terre, en ce moment</div>
              <div className="mt-1 max-w-[52ch] text-[12.5px] text-muted">Vitesse, densité et champ Bz mesurés au point L1 alimentent le modèle de magnétopause de Shue (1998). Particules turquoise : champ orienté au nord ; orange : au sud.</div>
            </div>
          </div>
          <div className="grid content-center gap-x-8 gap-y-4 border-t border-edge p-6 @2xl:grid-cols-3 @4xl:grid-cols-1 @4xl:border-l @4xl:border-t-0">
            <div>
              <div className="text-[12px] uppercase tracking-[0.14em] text-dim">Magnétopause</div>
              <div className="num text-[38px] font-semibold leading-none text-aurora">{mp ? fmt.dec(mp.r0) : "–"}<span className="ml-1.5 text-[14px] font-normal text-muted">rayons terrestres</span></div>
              <div className="mt-1 text-[12.5px] text-muted">{mp ? `soit ${fmt.int(mp.r0 * 6371)} km côté Soleil` : ""}</div>
            </div>
            <div className="hidden h-px bg-edge @4xl:block" />
            <div>
              <div className="text-[12px] uppercase tracking-[0.14em] text-dim">Satellites géostationnaires</div>
              <div className="mt-1 text-[18px] font-semibold" style={{ color: geoExposed ? COLORS.g5 : COLORS.calm }}>{geoExposed ? "Exposés au vent solaire" : "Protégés"}</div>
              <div className="text-[12.5px] text-muted">{mp ? mp.r0 >= 6.6 ? `orbite à 6,6 rayons : marge de ${fmt.dec(mp.r0 - 6.6)} ${mp.r0 - 6.6 >= 2 ? "rayons" : "rayon"}` : `orbite à 6,6 rayons : ${fmt.dec(6.6 - mp.r0)} au-delà de la magnétopause` : ""}</div>
            </div>
            <div className="hidden h-px bg-edge @4xl:block" />
            <div>
              <div className="text-[12px] uppercase tracking-[0.14em] text-dim">Délai L1 → Terre</div>
              <div className="num text-[26px] font-semibold text-sun">{delaiMin ? `${fmt.int(delaiMin)} min` : "–"}</div>
              <div className="text-[12.5px] text-muted">le vent mesuré maintenant frappera la Terre dans ce délai</div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 @4xl:grid-cols-[1.25fr_1fr]">
        <Panel className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full" style={{ background: `radial-gradient(circle, ${level.color}33, transparent 70%)` }} />
          {now.loading ? <Loading height={260} /> : (
            <div className="grid items-center gap-6 @2xl:grid-cols-[auto_1fr]">
              <KpGauge kp={kp} size={300} />
              <div>
                <div className="eyebrow">État de la magnétosphère</div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="rounded-lg px-2.5 py-1 text-[13px] font-semibold text-space" style={{ background: level.color }}>{level.code}</span>
                  <h2 className="text-[30px] font-semibold leading-tight text-ink">{level.label}</h2>
                </div>
                <p className="mt-3 max-w-[46ch] text-[14.5px] leading-relaxed text-muted">{level.text} {verdict}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
                  <div className="rounded-xl border border-edge px-3 py-2"><div className="text-dim">Tranche de 3 h</div><div className="num text-ink">{fmt.dateTime(date(r.kpTranche))}</div></div>
                  <div className="rounded-xl border border-edge px-3 py-2"><div className="text-dim">Kp maximal sur 24 h</div><div className="num text-ink">{fmt.kp(num(r.kpMax24h))}</div></div>
                </div>
              </div>
            </div>
          )}
        </Panel>
        <Panel title="Où voir une aurore ?" subtitle="Ovale auroral vu du pôle Nord, d'après le Kp maximal des dernières 24 heures">
          <div className="grid items-center gap-4 @xl:grid-cols-[auto_1fr]">
            <AuroraGlobe latitude={lat} size={230} />
            <div>
              <div className="num text-[34px] font-semibold text-aurora">{lat === null ? "–" : `${fmt.dec(lat, 0)}° N`}</div>
              <div className="text-[13px] text-muted">latitude géomagnétique minimale d'observation</div>
              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                Les villes en turquoise sont sous l'ovale. Il faut un Kp de 8 pour qu'une aurore soit visible depuis Metz, comme le 10 mai 2024.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-5 @3xl:grid-cols-5">
        <Stat label="Dernière mesure" value={fmt.hour(date(r.heure))} unit="UTC" hint={fmt.dayLong(date(r.heure))} color={COLORS.gold} small />
        <Stat label="Vitesse du vent" value={fmt.int(vitesse)} unit="km/s" hint={`maximum 24 h : ${fmt.int(num(r.vitesseMax24h))} km/s`} color={COLORS.sun} />
        <Stat label="Champ Bz" value={fmt.signed(bz)} unit="nT" hint={`minimum 24 h : ${fmt.dec(num(r.bzMin24h))} nT`} color={COLORS.cyan} />
        <Stat label="Densité" value={fmt.dec(num(r.densite))} unit="protons/cm³" hint="particules du vent solaire" color={COLORS.ink} />
        <Stat label="Pression dynamique" value={fmt.dec(num(r.pression), 2)} unit="nPa" hint={`couplage de Newell : ${fmt.int(num(r.newell))}`} color={COLORS.violet} />
      </div>

      <div className="grid gap-5 @4xl:grid-cols-2">
        <Panel data={kp7.rows} title="L'indice Kp des 8 derniers jours" subtitle="Une barre par tranche de 3 heures ; les pointillés marquent les seuils de tempête G1, G3 et G5">
          {kp7.loading ? <Loading /> : kp7.error ? <Failure message={kp7.error} /> : <KpBars points={kpPoints} height={230} />}
        </Panel>
        <Panel data={vent.rows} title="Le vent solaire, heure par heure" subtitle="Vitesse (orange) et champ Bz (turquoise) ; Bz sous -10 nT ouvre la porte aux tempêtes">
          {vent.loading ? <Loading /> : vent.error ? <Failure message={vent.error} /> : (
            <div className="grid gap-2">
              <TimeChart series={[{ name: "Vitesse", color: COLORS.sun, points: ventSeries, area: true }]} height={110} unit="km/s" />
              <TimeChart series={[{ name: "Bz", color: COLORS.cyan, points: bzSeries }]} height={110} unit="nT" digits={1}
                zones={[{ from: -40, to: -10, color: COLORS.g5, label: "zone de tempête" }]} refLines={[{ y: 0, color: "#8FA0C0", label: "" }]} />
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
