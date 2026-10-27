import type { ReactNode } from "react";
import { useDax, num, date, fmt } from "@/lib/helios-data";
import { COLORS } from "@/lib/space";
import { Panel } from "@/components/ui";
import { LogoMark } from "@/components/Logo";

const STAGES = [
  { t: "Sources", d: "NOAA SWPC · NASA DONKI · GFZ Potsdam · SILSO", c: COLORS.gold },
  { t: "Collecteur", d: "Notebook Databricks, chaque jour à 6 h 17", c: COLORS.sun },
  { t: "Bronze", d: "Fichiers bruts, empreinte SHA-256", c: "#CD7F32" },
  { t: "Silver", d: "Nettoyage, contrôles, historique des révisions", c: "#C0C7D4" },
  { t: "Gold", d: "Indicateurs physiques prêts à l'emploi", c: COLORS.gold },
  { t: "Modèle sémantique", d: "Power BI, 31 mesures DAX", c: COLORS.cyan },
  { t: "HÉLIOS", d: "Application Fabric, lecture en direct", c: COLORS.violet },
];

function Pipeline() {
  return (
    <div className="grid gap-3 @2xl:grid-cols-7">
      {STAGES.map((s, i) => (
        <div key={s.t} className="relative">
          <div className="h-full rounded-2xl border border-edge bg-panel-2/50 p-3">
            <div className="flex items-center gap-2">
              <span className="num flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-space" style={{ background: s.c }}>{i + 1}</span>
              <span className="text-[13.5px] font-semibold text-ink">{s.t}</span>
            </div>
            <div className="mt-2 text-[12px] leading-snug text-muted">{s.d}</div>
          </div>
          {i < STAGES.length - 1 && <div className="absolute -right-3 top-1/2 hidden h-px w-3 bg-sun/60 md:block" />}
        </div>
      ))}
    </div>
  );
}

function Def({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="border-t border-edge py-3">
      <dt className="text-[13.5px] font-semibold text-ink">{term}</dt>
      <dd className="mt-1 text-[13px] leading-relaxed text-muted">{children}</dd>
    </div>
  );
}

const SCALE = [
  ["G1", "Mineure", "Kp 5", "≈ 900 jours par cycle", COLORS.g1],
  ["G2", "Modérée", "Kp 6", "≈ 360 jours par cycle", COLORS.g2],
  ["G3", "Forte", "Kp 7", "≈ 130 jours par cycle", COLORS.g3],
  ["G4", "Sévère", "Kp 8, dont 9-", "≈ 60 jours par cycle", COLORS.g4],
  ["G5", "Extrême", "Kp 9", "≈ 4 jours par cycle", COLORS.g5],
];

export default function NoteEdition({ reload }: { reload: number }) {
  const now = useDax("maintenant", reload);
  const k = useDax("chiffresCles", reload).rows[0] ?? {};
  const r = now.rows[0] ?? {};
  const last = date(r.heure);

  return (
    <div className="grid gap-5">
      <Panel className="overflow-hidden">
        <div className="grid items-center gap-8 @3xl:grid-cols-[auto_1fr]">
          <div className="flex justify-center"><LogoMark size={150} /></div>
          <div>
            <div className="eyebrow">Note d'édition</div>
            <h2 className="mt-2 text-[28px] font-semibold leading-tight text-ink">Observer l'espace comme une salle de contrôle</h2>
            <p className="mt-3 max-w-[85ch] text-[14.5px] leading-relaxed text-muted">
              HÉLIOS suit la chaîne complète de la météo spatiale : le Soleil qui produit taches et éruptions, les éjections de masse coronale qui traversent
              150 millions de kilomètres, le vent solaire mesuré au point L1, puis la réponse du champ magnétique terrestre, mesurée sans interruption depuis 1932.
              Chaque chiffre affiché est lu à l'ouverture dans le modèle sémantique, avec les droits Fabric de la personne connectée.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-[12.5px] @2xl:grid-cols-4">
              {[
                ["Édition", "1.8 · octobre 2026"],
                ["Dernière mesure", last ? fmt.dateTime(last) : "–"],
                ["Profondeur", `${fmt.int(num(k.joursObserves))} jours de Kp, 277 ans de taches`],
                ["Conception", "Abdoul Hamid DIALLO"],
              ].map(([a, b]) => (
                <div key={a} className="rounded-xl border border-edge px-3 py-2">
                  <div className="text-dim">{a}</div>
                  <div className="text-ink">{b}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="La chaîne de données" subtitle="De l'appel aux services publics jusqu'à cet écran, sans copie manuelle : chaque étape est automatisée, contrôlée et traçable.">
        <Pipeline />
        <div className="mt-4 grid gap-3 text-[12.5px] text-muted @2xl:grid-cols-3">
          <div className="rounded-xl border border-edge p-3"><span className="font-semibold text-ink">Fraîcheur.</span> Le collecteur appelle les sources chaque matin ; le pipeline Lakeflow met à jour bronze, silver et gold, puis un contrôle vérifie que le vent solaire a moins de 6 heures.</div>
          <div className="rounded-xl border border-edge p-3"><span className="font-semibold text-ink">Qualité.</span> Des règles écartent les mesures impossibles (vitesse hors de 200 à 3 000 km/s, Kp hors de 0 à 9) et chaque révision d'une fiche NASA est historisée.</div>
          <div className="rounded-xl border border-edge p-3"><span className="font-semibold text-ink">Traçabilité.</span> Unity Catalog relie chaque indicateur à ses fichiers sources ; chaque fichier brut porte son adresse d'origine, sa date de collecte et son empreinte.</div>
        </div>
      </Panel>

      <div className="grid gap-5 @4xl:grid-cols-2">
        <Panel title="L'échelle des tempêtes géomagnétiques" subtitle="Échelle officielle de la NOAA, fondée sur l'indice Kp planétaire (0 à 9, par tranches de 3 heures)">
          <table className="w-full text-[13px]">
            <tbody>
              {SCALE.map(([g, l, kp, f, c]) => (
                <tr key={g} className="border-t border-edge">
                  <td className="py-2.5"><span className="rounded-md px-2 py-0.5 text-[12px] font-semibold text-space" style={{ background: c }}>{g}</span></td>
                  <td className="text-ink">{l}</td>
                  <td className="num text-muted">{kp}</td>
                  <td className="text-right text-dim">{f}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[12px] text-dim">Fréquences moyennes publiées par la NOAA pour un cycle solaire de 11 ans. HÉLIOS compte un jour G4 dès que le Kp atteint 9- et un jour G5 au Kp 9.</p>
        </Panel>

        <Panel title="Glossaire" subtitle="Les mots de la météo spatiale, en une phrase chacun">
          <dl>
            <Def term="Indice Kp">Mesure planétaire de la perturbation du champ magnétique terrestre sur 3 heures, de 0 (calme) à 9 (extrême), calculée par le GFZ Potsdam à partir de 13 observatoires.</Def>
            <Def term="Indice Ap">Amplitude journalière de la perturbation, sur une échelle linéaire : il départage deux journées qui atteignent toutes deux Kp 9.</Def>
            <Def term="Éjection de masse coronale (CME)">Nuage de plasma magnétisé expulsé par le Soleil, jusqu'à plusieurs milliards de tonnes, qui déclenche les grandes tempêtes.</Def>
            <Def term="Champ Bz">Composante nord-sud du champ magnétique du vent solaire. Orientée au sud, elle se connecte au champ terrestre et laisse entrer l'énergie.</Def>
          </dl>
        </Panel>
      </div>

      <Panel title="Méthode" subtitle="Comment chaque indicateur est calculé">
        <dl className="grid gap-x-8 @2xl:grid-cols-2">
          <Def term="Trajet balistique">Distance Soleil-Terre (149 597 871 km) divisée par la vitesse de départ de la CME : le temps de trajet si rien ne la freinait.</Def>
          <Def term="Modèle ajusté">Régression trajet = a × vitesse<sup>b</sup> sur les trajets observés depuis 2010. Elle capture le freinage des éjections rapides et l'entraînement des lentes par le vent solaire ambiant.</Def>
          <Def term="Liens écartés">Un lien CME → tempête est écarté des moyennes quand la durée observée impliquerait une vitesse moyenne supérieure à 1,6 fois la vitesse de départ : la tempête a alors été causée par une autre éjection.</Def>
          <Def term="Couplage de Newell">v<sup>4/3</sup> · B<sub>T</sub><sup>2/3</sup> · sin<sup>8/3</sup>(θ/2) : l'énergie que le vent solaire transmet à la magnétosphère (Newell et al., 2007).</Def>
          <Def term="Pression dynamique">1,6726 × 10<sup>-6</sup> × densité × vitesse² (nPa). Au-delà de 10 nPa, le bouclier terrestre recule nettement vers la Terre.</Def>
          <Def term="Ovale auroral">Latitude géomagnétique minimale de visibilité des aurores en fonction du Kp, d'après la table de la NOAA.</Def>
        </dl>
      </Panel>

      <div className="grid gap-5 @4xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Sources et licences">
          <ul className="grid gap-2 text-[13px] text-muted">
            <li><span className="font-semibold text-ink">NOAA Space Weather Prediction Center</span> · vent solaire temps réel (SOLAR1, IMAP, ACE), Kp récent, rayons X GOES, cycle solaire. Domaine public.</li>
            <li><span className="font-semibold text-ink">NASA CCMC DONKI</span> · catalogue des CME, tempêtes géomagnétiques et éruptions, avec leurs liens de causalité. Domaine public.</li>
            <li><span className="font-semibold text-ink">GFZ Helmholtz Centre Potsdam</span> · indices Kp et Ap définitifs depuis 1932. Licence CC BY 4.0.</li>
            <li><span className="font-semibold text-ink">SILSO, Observatoire royal de Belgique</span> · nombre de taches solaires depuis 1749. Licence CC BY-NC 4.0.</li>
          </ul>
        </Panel>
        <Panel title="Précautions de lecture">
          <ul className="grid list-disc gap-2 pl-5 text-[13px] text-muted">
            <li>Les mesures de vent solaire couvrent les dernières 24 heures à chaque collecte et s'allongent jour après jour.</li>
            <li>Le Kp des dernières heures est provisoire (NOAA) jusqu'à sa publication définitive par le GFZ.</li>
            <li>HÉLIOS est un outil d'analyse ; les alertes officielles restent celles de la NOAA.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
