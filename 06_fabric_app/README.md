# HÉLIOS · Observatoire (Fabric Apps)

Application React et TypeScript hébergée dans Microsoft Fabric. Elle lit le modèle sémantique Power BI HÉLIOS en DAX, avec les droits de la personne connectée, et raconte la météo de l'espace en six écrans.

| Écran | Ce qu'il montre |
| --- | --- |
| Maintenant | Bulletin de risques, magnétosphère animée (modèle de Shue 1998), jauge Kp, ovale auroral, vent solaire |
| Vent solaire | Les sondes SOLAR1, IMAP et ACE comparées, champ Bz, couplage de Newell, pression dynamique |
| Du Soleil à la Terre | Voyage animé de chaque CME, nuage vitesse et trajet avec modèle ajusté, simulateur d'arrivée |
| Un siècle de tempêtes | Carte thermique mois par mois depuis 1932, top 10, anatomie d'une tempête |
| Le cycle solaire | Taches solaires depuis 1749, 25 cycles superposés, éruptions C, M et X |
| Note d'édition | Chaîne de données, échelle NOAA, glossaire, méthode, sources |

## Organisation

| Dossier | Contenu |
| --- | --- |
| `src/queries/` | Les 12 requêtes DAX, une par jeu de données |
| `src/pages/` | Les six écrans |
| `src/components/` | Graphiques SVG et canvas, magnétosphère, anatomie de tempête, logo |
| `src/lib/` | Accès aux données (`helios-data.ts`), physique et couleurs (`space.ts`), export PNG et CSV |
| `src/demo/` | Données de démonstration pour un aperçu local, jamais utilisées dans Fabric |
| `rayfin/rayfin.yml` | Déclaration de l'application pour l'hébergement Fabric |
| `fabric.yaml` | Le modèle sémantique lu par l'application, sous l'alias `helios` |

## Déployer dans votre espace Fabric

Prérequis : Node.js 20 ou plus, un espace Fabric sur une capacité, et le modèle sémantique HÉLIOS publié dans cet espace.

1. Dans `fabric.yaml`, remplacez les deux identifiants par ceux de votre espace et de votre modèle sémantique.
2. Dans PowerShell, depuis ce dossier :

```powershell
npm install
npx rayfin login
npx rayfin up --workspace-id <identifiant-de-votre-espace> --item-name HELIOS_Observatoire --yes
```

3. Ouvrez l'élément HELIOS_Observatoire dans votre espace Fabric.

## Aperçu local, sans Fabric

```powershell
npm install
$env:VITE_DEMO="1"; npx vite
```

L'application s'ouvre sur http://localhost:5173 avec des données de démonstration.
