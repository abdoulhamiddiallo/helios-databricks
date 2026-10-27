// Données de démonstration pour l'aperçu local hors de Fabric (jamais utilisées une fois déployé).
import { setDemoLoader, type Row } from "@/lib/helios-data";
import type { QueryName } from "@/queries";

const iso = (d: Date) => d.toISOString().slice(0, 19);
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const end = new Date(Date.UTC(2026, 9, 26, 14));
const hours = Array.from({ length: 27 }, (_, i) => new Date(end.getTime() - (26 - i) * 3600e3));

const cycle = (y: number) => Math.max(0, Math.sin(((y - 1755.5) / 11.05) * 2 * Math.PI - Math.PI / 2) + 1);

function build(name: QueryName): Row[] {
  switch (name) {
    case "maintenant":
      return [{ heure: iso(end), vitesse: 347.6, densite: 4.15, bz: 2.03, pression: 0.86, newell: 849, kp: 2, kpTranche: "2026-10-26T09:00:00", kpMax24h: 2.33, vitesseMax24h: 361.1, bzMin24h: -5.43 }];
    case "kpSemaine":
      return Array.from({ length: 64 }, (_, i) => {
        const t = new Date(Date.UTC(2026, 9, 18, 12) + i * 3 * 3600e3);
        const kp = Math.round((1.5 + 2.2 * Math.abs(Math.sin(i / 7)) + (i > 30 && i < 38 ? 2.8 : 0) + rnd()) * 3) / 3;
        return { debut: iso(t), kp: Math.min(kp, 9), classe: kp >= 5 ? "G1" : "Calme", source: "GFZ Potsdam" };
      });
    case "ventHoraire":
      return hours.map((t, i) => ({
        heure: iso(t), vitesse: 360 - 30 * Math.sin(i / 5) + rnd() * 6, densite: 3 + 2 * rnd(),
        bz: -2 - 3 * Math.sin(i / 3) + rnd() * 2, pression: 0.6 + rnd() * 0.6, newell: 800 + 2500 * Math.abs(Math.sin(i / 4)),
      }));
    case "sondes":
      return hours.flatMap((t, i) =>
        ["ACE", "IMAP", "SOLAR1"].map((s, j) => ({ heure: iso(t), sonde: s, officielle: s === "SOLAR1", vitesse: 355 - 28 * Math.sin(i / 5) + j * -6 + rnd() * 4, densite: 3 + rnd() })),
      );
    case "carteThermique": {
      const out: Row[] = [];
      for (let y = 1932; y <= 2026; y++)
        for (let m = 1; m <= 12; m++) {
          if (y === 2026 && m > 10) continue;
          const c = cycle(y);
          const kp = Math.min(9, 3.5 + c * 1.6 + rnd() * 2.6 * (0.6 + c / 2));
          out.push({ Annee: y, NoMois: m, kpMax: Math.round(kp * 3) / 3, joursForts: kp >= 7.66 ? 1 + Math.floor(rnd() * 2) : null, joursG5: kp >= 9 ? 1 : null });
        }
      return out;
    }
    case "annees":
      return Array.from({ length: 95 }, (_, i) => {
        const y = 1932 + i, c = cycle(y);
        return { Annee: y, tempete: Math.round(30 + c * 60 + rnd() * 20), g4: Math.round(c * 5 * rnd() * 2), g5: rnd() > 0.85 && c > 1 ? 1 : null, taches: 10 + c * 85 + rnd() * 15, apMoyen: 8 + c * 6 };
      });
    case "topJournees":
      return [
        ["1960-11-13", 9, 280, 19, 173], ["2024-05-11", 9, 271, 25, 173], ["1989-03-13", 9, 246, 22, 210], ["1960-04-01", 8.67, 241, 19, 180],
        ["1959-07-15", 9, 236, 19, 200], ["1941-09-18", 8.67, 232, 17, 120], ["1941-07-05", 9, 222, 17, 110], ["1946-03-28", 8.67, 213, 18, 150],
        ["1941-03-01", 9, 207, 17, 100], ["2003-10-29", 9, 204, 23, 250],
      ].map(([d, kp, ap, cy, ta]) => ({ jour: `${d}T00:00:00`, kpMax: kp, ap, classe: (kp as number) >= 9 ? "G5" : "G4", cycle: cy, taches: ta }));
    case "cycles":
      return [
        [16, "1923-08-01", "1933-09-01", 3, null, 111, 15.9, 609], [17, "1933-09-01", "1944-02-01", 41, 5, 844, 96, 3805],
        [18, "1944-02-01", "1954-04-01", 52, 2, 1075, 109, 3712], [19, "1954-04-01", "1964-10-01", 74, 7, 1047, 129.2, 3836],
        [20, "1964-10-01", "1976-03-01", 34, 4, 837, 86.9, 4169], [21, "1976-03-01", "1986-09-01", 39, 3, 1045, 111.3, 3836],
        [22, "1986-09-01", "1996-08-01", 41, 2, 965, 106.3, 3622], [23, "1996-08-01", "2008-12-01", 40, 3, 797, 82.6, 4505],
        [24, "2008-12-01", "2019-12-01", 9, null, 381, 49.5, 4017], [25, "2019-12-01", "2031-01-01", 16, 1, 337, 86, 2522],
      ].map(([n, d, f, g4, g5, t, ta, j]) => ({ cycle: n, debut: `${d}T00:00:00`, fin: `${f}T00:00:00`, g4, g5, tempete: t, taches: ta, jours: j }));
    case "cme":
      return Array.from({ length: 148 }, (_, i) => {
        const v = 350 + Math.pow(rnd(), 1.6) * 2100;
        const bal = 149597870.7 / v / 3600;
        const tr = Math.max(15, bal + 8 + (rnd() - 0.4) * 30 - (v > 1500 ? -15 : 0));
        const dep = new Date(Date.UTC(2010, 0, 1) + rnd() * 16.8 * 365 * 86400e3);
        const kp = Math.min(9, 5 + Math.round(rnd() * 3 * (v / 1500) * 3) / 3);
        return {
          gst: `G${i}`, cme: `C${i}`, depart: iso(dep), arrivee: iso(new Date(dep.getTime() + tr * 3600e3)), kpMax: kp, vitesse: Math.round(v),
          demiAngle: 40, type: v < 500 ? "S" : v < 1000 ? "C" : v < 2000 ? "O" : "R", position: "N18W12", region: 13664,
          transit: Math.round(tr * 10) / 10, balistique: Math.round(bal * 10) / 10, ecart: Math.round((tr - bal) * 10) / 10, lien: "https://ccmc.gsfc.nasa.gov/DONKI/",
        };
      });
    case "eruptions":
      return Array.from({ length: 17 }, (_, i) => {
        const y = 2010 + i, c = cycle(y);
        return { Annee: y, c: Math.round(40 + c * 300 * rnd() + c * 200), m: Math.round(c * 40 + rnd() * 20), x: Math.round(c * 6 * rnd()) };
      });
    case "taches1749": {
      const out: Row[] = [];
      for (let y = 1749; y <= 2026; y++)
        for (let m = 1; m <= 12; m++) {
          if (y === 2026 && m > 9) break;
          const c = cycle(y + m / 12);
          out.push({ mois: `${y}-${String(m).padStart(2, "0")}-01T00:00:00`, taches: Math.max(0, c * (70 + 50 * Math.sin(y / 40)) + (rnd() - 0.5) * 50), f107: y > 1947 ? 70 + c * 60 : null });
        }
      return out;
    }
    case "chiffresCles":
      return [{ joursObserves: 34633, joursTempete: 7439, joursG4: 349, joursG5: 27, apRecord: 280, journeeRecord: "13 novembre 1960", cme: 148, tempetesReliees: 104, transitMoyen: 66.866, transitMin: 15.6, vitesseCme: 889.2, ecartBalistique: 6.29, eruptions: 3397, eruptionsX: 156 }];
  }
  return [];
}

export function installDemo() {
  setDemoLoader(async (name) => {
    await new Promise((r) => setTimeout(r, 150));
    if (String(name).startsWith("tempete:")) {
      const d = new Date(String(name).slice(8) + "T00:00:00Z");
      return Array.from({ length: 56 }, (_, i) => {
        const t = new Date(d.getTime() + (i - 24) * 3 * 3600e3);
        const peak = Math.exp(-(((i - 26) / 4) ** 2));
        return { debut: iso(t), kp: Math.round(Math.min(9, 1.5 + 7.5 * peak + rnd()) * 3) / 3 };
      });
    }
    return build(name as QueryName);
  });
}
