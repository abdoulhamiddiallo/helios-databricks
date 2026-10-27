// Connaissances de météo spatiale utilisées par l'interface

export const COLORS = {
  calm: "#34D399",
  g1: "#FACC15",
  g2: "#FDBA3B",
  g3: "#FF8A3D",
  g4: "#F2603A",
  g5: "#EF4444",
  sun: "#FF8A3D",
  cyan: "#2DD4BF",
  violet: "#8B5CF6",
  gold: "#FACC15",
  ink: "#EEF3FB",
  muted: "#8FA0C0",
  grid: "#1B2742",
};

export interface StormLevel {
  code: string;
  label: string;
  color: string;
  text: string;
}

/** Échelle NOAA des tempêtes géomagnétiques (Kp 5- compté en G1, 9- en G4). */
export function stormLevel(kp: number | null): StormLevel {
  if (kp === null) return { code: "–", label: "Inconnu", color: COLORS.muted, text: "Pas de mesure récente." };
  if (kp >= 9) return { code: "G5", label: "Tempête extrême", color: COLORS.g5, text: "Réseaux électriques et satellites menacés, aurores visibles jusqu'aux tropiques." };
  if (kp >= 7.66) return { code: "G4", label: "Tempête sévère", color: COLORS.g4, text: "Perturbations GPS et radio, aurores visibles dans toute l'Europe." };
  if (kp >= 6.66) return { code: "G3", label: "Tempête forte", color: COLORS.g3, text: "Corrections de tension sur les réseaux, aurores jusqu'en France du Nord." };
  if (kp >= 5.66) return { code: "G2", label: "Tempête modérée", color: COLORS.g2, text: "Alertes possibles sur les réseaux à haute latitude, aurores en Écosse." };
  if (kp >= 4.66) return { code: "G1", label: "Tempête mineure", color: COLORS.g1, text: "Faibles fluctuations des réseaux, aurores en Scandinavie." };
  if (kp >= 4) return { code: "Actif", label: "Champ agité", color: "#A3E635", text: "Magnétosphère agitée, sans tempête." };
  return { code: "Calme", label: "Magnétosphère calme", color: COLORS.calm, text: "Aucune perturbation notable : le bouclier terrestre est au repos." };
}

/** Latitude géomagnétique approximative jusqu'où une aurore peut être vue, selon le Kp (règle NOAA). */
export function auroraLatitude(kp: number | null): number | null {
  if (kp === null) return null;
  const table = [66.5, 64.5, 62.4, 60.4, 58.3, 56.3, 54.2, 52.2, 50.1, 48.1];
  const k = Math.max(0, Math.min(9, kp));
  const i = Math.floor(k);
  const f = k - i;
  return i >= 9 ? table[9] : table[i] + (table[i + 1] - table[i]) * f;
}

export function kpColor(kp: number | null): string {
  return stormLevel(kp).color;
}

/** Couleur d'une case de la carte thermique selon le Kp maximal du mois. */
const HEAT: [number, [number, number, number]][] = [
  [0, [10, 20, 42]], [3, [16, 44, 74]], [4.66, [20, 96, 112]], [5.66, [45, 170, 160]],
  [6.66, [250, 204, 21]], [7.66, [255, 138, 61]], [8.67, [242, 96, 58]], [9, [255, 45, 85]],
];

/** Couleur continue d'une case de la carte thermique selon le Kp maximal du mois. */
export function heatColor(kp: number | null): string {
  if (kp === null) return "#070C18";
  const k = Math.max(0, Math.min(9, kp));
  for (let i = 1; i < HEAT.length; i++) {
    const [k1, c1] = HEAT[i];
    const [k0, c0] = HEAT[i - 1];
    if (k <= k1) {
      const f = (k - k0) / (k1 - k0);
      const c = c0.map((v, j) => Math.round(v + (c1[j] - v) * f));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return "rgb(255,45,85)";
}

/** Minimums des cycles solaires 1 à 25 (SILSO), mois de départ de chaque cycle. */
export const CYCLE_MINIMA: [number, number, number][] = [
  [1, 1755, 2], [2, 1766, 6], [3, 1775, 6], [4, 1784, 9], [5, 1798, 4], [6, 1810, 8], [7, 1823, 5],
  [8, 1833, 11], [9, 1843, 7], [10, 1855, 12], [11, 1867, 3], [12, 1878, 12], [13, 1890, 3], [14, 1902, 1],
  [15, 1913, 7], [16, 1923, 8], [17, 1933, 9], [18, 1944, 2], [19, 1954, 4], [20, 1964, 10], [21, 1976, 3],
  [22, 1986, 9], [23, 1996, 8], [24, 2008, 12], [25, 2019, 12],
];

export const AU_KM = 149597870.7;
/** Temps de trajet balistique Soleil-Terre (heures) à vitesse constante. */
export const ballisticHours = (kms: number) => AU_KM / kms / 3600;

export const CME_TYPES: Record<string, string> = {
  S: "Lente · moins de 500 km/s",
  C: "Courante · 500 à 999 km/s",
  O: "Occasionnelle · 1 000 à 1 999 km/s",
  R: "Rare · 2 000 à 2 999 km/s",
  ER: "Extrêmement rare · 3 000 km/s et plus",
};
