import { useMemo } from "react";
import { useDax, num, date, fmt, type Row } from "@/lib/helios-data";
import { COLORS } from "@/lib/space";
import { Panel, Loading, Failure, Legend } from "@/components/ui";
import { TimeChart, type TimeSeries } from "@/components/charts";

const PROBES: Record<string, { color: string; text: string }> = {
  SOLAR1: { color: COLORS.cyan, text: "NOAA, lancée en 2025, sonde de référence" },
  IMAP: { color: COLORS.violet, text: "NASA, lancée en 2025" },
  ACE: { color: COLORS.sun, text: "NASA, en service depuis 1997" },
};

function seriesBy(rows: Row[], key: string) {
  return rows.map((r) => ({ t: date(r.heure)!, v: num(r[key]) }));
}

export default function VentSolaire({ reload }: { reload: number }) {
  const vent = useDax("ventHoraire", reload);
  const sondes = useDax("sondes", reload);

  const probeSeries: TimeSeries[] = useMemo(() => {
    const hours = Array.from(new Set(sondes.rows.map((r) => String(r.heure)))).sort();
    return Object.keys(PROBES).map((name) => {
      const byHour = new Map(sondes.rows.filter((r) => r.sonde === name).map((r) => [String(r.heure), num(r.vitesse)]));
      return { name, color: PROBES[name].color, width: 2, points: hours.map((h) => ({ t: date(h)!, v: byHour.get(h) ?? null })) };
    });
  }, [sondes.rows]);

  const ecart = useMemo(() => {
    const out: Record<string, number[]> = {};
    const hours = new Map<string, Row[]>();
    sondes.rows.forEach((r) => hours.set(String(r.heure), [...(hours.get(String(r.heure)) ?? []), r]));
    hours.forEach((rs) => {
      const ref = rs.find((r) => r.sonde === "SOLAR1");
      if (!ref) return;
      rs.forEach((r) => {
        if (r.sonde === "SOLAR1") return;
        const a = num(r.vitesse), b = num(ref.vitesse);
        if (a !== null && b !== null) (out[String(r.sonde)] ??= []).push(a - b);
      });
    });
    return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.reduce((s, x) => s + x, 0) / v.length]));
  }, [sondes.rows]);

  if (vent.error) return <Failure message={vent.error} />;
  const loading = vent.loading || sondes.loading;

  return (
    <div className="grid gap-5">
      <Panel title="Trois sondes, un même vent" subtitle="Au point de Lagrange L1, à 1,5 million de km, trois sondes mesurent le vent solaire environ une heure avant qu'il n'atteigne la Terre"
        right={<Legend items={Object.entries(PROBES).map(([k, v]) => ({ label: k, color: v.color }))} />}>
        {loading ? <Loading height={280} /> : sondes.error ? <Failure message={sondes.error} /> : (
          <>
            <TimeChart series={probeSeries} height={280} unit="km/s" />
            <div className="mt-4 grid gap-3 @2xl:grid-cols-3">
              {Object.entries(PROBES).map(([k, v]) => (
                <div key={k} className="rounded-xl border border-edge px-4 py-3">
                  <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: v.color }} /><span className="font-semibold text-ink">{k}</span></div>
                  <div className="mt-1 text-[12.5px] text-muted">{v.text}</div>
                  {k !== "SOLAR1" && ecart[k] !== undefined && (
                    <div className="mt-1 text-[12.5px] text-dim">écart moyen avec SOLAR1 : <span className="num text-ink">{fmt.signed(ecart[k], 1)} km/s</span></div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Panel>

      <div className="grid gap-5 @4xl:grid-cols-2">
        <Panel title="Champ magnétique Bz (nT)" subtitle="Orienté au sud (négatif), il se connecte à celui de la Terre et laisse entrer l'énergie">
          {loading ? <Loading /> : (
            <TimeChart series={[{ name: "Bz minimal", color: COLORS.cyan, points: seriesBy(vent.rows, "bz") }]} height={240} unit="nT" digits={1}
              zones={[{ from: -60, to: -10, color: COLORS.g5, label: "risque de tempête" }]} refLines={[{ y: 0, color: "#8FA0C0", label: "nord ↑ · sud ↓" }]} />
          )}
        </Panel>
        <Panel title="Énergie transmise à la Terre" subtitle="Couplage de Newell : combine la vitesse du vent et l'orientation du champ magnétique">
          {loading ? <Loading /> : (
            <TimeChart series={[{ name: "Couplage de Newell", color: COLORS.violet, points: seriesBy(vent.rows, "newell"), area: true }]} height={240} />
          )}
        </Panel>
        <Panel title="Densité du vent (protons/cm³)" subtitle="Un vent dense comprime la magnétosphère, surtout lors de l'arrivée d'une CME">
          {loading ? <Loading /> : (
            <TimeChart series={[{ name: "Densité", color: COLORS.gold, points: seriesBy(vent.rows, "densite") }]} height={220} unit="p/cm³" digits={1} />
          )}
        </Panel>
        <Panel title="Pression dynamique (nPa)" subtitle="Densité × vitesse² : au-delà de 10 nPa, le bouclier terrestre recule fortement">
          {loading ? <Loading /> : (
            <TimeChart series={[{ name: "Pression", color: COLORS.sun, points: seriesBy(vent.rows, "pression"), area: true }]} height={220} unit="nPa" digits={2} />
          )}
        </Panel>
      </div>
    </div>
  );
}
