// Requêtes DAX de l'application, chacune dans son fichier .dax
import maintenant from "./maintenant.dax?raw";
import kpSemaine from "./kp-semaine.dax?raw";
import ventHoraire from "./vent-horaire.dax?raw";
import sondes from "./sondes.dax?raw";
import carteThermique from "./carte-thermique.dax?raw";
import annees from "./annees.dax?raw";
import topJournees from "./top-journees.dax?raw";
import cycles from "./cycles.dax?raw";
import cme from "./cme.dax?raw";
import eruptions from "./eruptions.dax?raw";
import taches1749 from "./taches-1749.dax?raw";
import chiffresCles from "./chiffres-cles.dax?raw";

export const QUERIES = {
  maintenant,
  kpSemaine,
  ventHoraire,
  sondes,
  carteThermique,
  annees,
  topJournees,
  cycles,
  cme,
  eruptions,
  taches1749,
  chiffresCles,
} as const;

export type QueryName = keyof typeof QUERIES;
