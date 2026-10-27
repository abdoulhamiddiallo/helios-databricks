# HÉLIOS · Modèle sémantique et rapport Power BI

Le projet Power BI au format **PBIP** (dossiers texte, versionnables dans Git) : le modèle sémantique en **TMDL** et le rapport en **PBIR**. Il lit la couche gold de Databricks en mode **Import** et sert de source unique au rapport et à l'application Fabric Apps.

<p align="center"><img src="../docs/modele_semantique.png" alt="Schéma en étoile du modèle sémantique HÉLIOS" width="100%"></p>

## Ouvrir le projet

1. Ouvrez `HELIOS_Meteo_Spatiale.pbip` dans Power BI Desktop (version récente, avec l'aperçu « Enregistrer au format Power BI Project » activé si votre version le demande).
2. **Accueil**, **Transformer les données**, **Modifier les paramètres** : renseignez vos deux valeurs, lues dans Databricks (**SQL Warehouses**, votre entrepôt, onglet **Connection details**).

| Paramètre | Valeur à saisir |
| --- | --- |
| `DatabricksHote` | **Server hostname**, par exemple `adb-1234567890123456.7.azuredatabricks.net` |
| `DatabricksCheminHttp` | **HTTP path**, par exemple `/sql/1.0/warehouses/abcdef1234567890` |

**3.** **Actualiser**. Authentification : **Compte d'organisation**, puis **Se connecter**.

Les huit requêtes du modèle utilisent ces deux paramètres : changer d'espace Databricks se fait en un seul endroit.

## Les tables

| Table | Rôle | Grain | Source |
| --- | --- | --- | --- |
| `Calendrier` | Dimension de dates, marquée comme table de dates | un jour depuis le 1er janvier 1932 | DAX (`CALENDAR`) |
| `dim_cycles_solaires` | Dimension | un cycle solaire (16 à 25) | `helios.gold` |
| `journal_geomagnetique` | Fait | un jour | `helios.gold` |
| `kp_3h` | Fait | une tranche de 3 heures | `helios.gold` |
| `du_soleil_a_la_terre` | Fait | un couple tempête et CME | `helios.gold` |
| `eruptions_mensuelles` | Fait | un mois et une classe d'éruption | `helios.gold` |
| `vent_solaire_horaire` | Fait autonome | une heure | `helios.gold` |
| `comparaison_sondes` | Fait autonome | une heure et une sonde | `helios.gold` |
| `cycle_solaire_mensuel` | Fait autonome | un mois depuis 1749 | `helios.silver` |
| `Mesures` | Table de mesures, sans données | | DAX |

## Les relations

Toutes un-à-plusieurs, filtre dans un seul sens, de la dimension vers le fait.

| De (plusieurs) | Vers (un) |
| --- | --- |
| `journal_geomagnetique[jour]` | `Calendrier[Date]` |
| `kp_3h[jour]` | `Calendrier[Date]` |
| `du_soleil_a_la_terre[jour_tempete]` | `Calendrier[Date]` |
| `eruptions_mensuelles[mois]` | `Calendrier[Date]` |
| `journal_geomagnetique[cycle]` | `dim_cycles_solaires[cycle]` |

`jour_tempete` est une colonne calculée qui ramène l'heure de début de la tempête à sa date, pour la relier au calendrier.

## Les bonnes pratiques appliquées

| Pratique | Dans HÉLIOS |
| --- | --- |
| Schéma en étoile | Un calendrier unique partagé par les quatre faits datés |
| Table de dates dédiée | `Calendrier` marquée comme table de dates, date/heure automatique désactivée |
| Table de mesures | Les 31 mesures rangées dans 5 dossiers d'affichage |
| Filtres explicites | `KEEPFILTERS` sur les classes NOAA : un segment sur la classe reste respecté |
| Documentation | Descriptions en français sur les tables et les mesures clés, visibles au survol |
| Formats | Chaque mesure porte son format (milliers, décimales, signe) |
| Paramètres | Hôte et chemin HTTP Databricks paramétrés |
| Mode Import | L'entrepôt SQL ne travaille qu'aux actualisations |
| Format PBIP, TMDL et PBIR | Chaque modification se relit ligne à ligne dans Git |

## Les 31 mesures

**1. Activité géomagnétique**

| Mesure et sens | DAX | Format |
| --- | --- | --- |
| **Jours observés**<br>Nombre de jours de mesure du Kp (GFZ depuis 1932, puis NOAA). | `COUNTROWS(journal_geomagnetique)` | `#,0` |
| **Jours de tempête**<br>Jours dont le Kp maximal atteint au moins la classe NOAA G1. | `CALCULATE(COUNTROWS(journal_geomagnetique), KEEPFILTERS(journal_geomagnetique[classe_noaa] <> "Calme"))` | `#,0` |
| **Jours de tempête forte (G4 ou G5)**<br>Jours de tempête sévère ou extrême. | `CALCULATE(COUNTROWS(journal_geomagnetique), KEEPFILTERS(journal_geomagnetique[classe_noaa] IN {"G4", "G5"}))` | `#,0` |
| **Jours G5**<br>Jours de tempête extrême (Kp 9). | `CALCULATE(COUNTROWS(journal_geomagnetique), KEEPFILTERS(journal_geomagnetique[classe_noaa] = "G5"))` | `#,0` |
| **Part des jours de tempête** | `DIVIDE([Jours de tempête], [Jours observés])` | `0.0 %` |
| **Kp maximal** | `MAX(journal_geomagnetique[kp_max])` | `0.00` |
| **Ap moyen**<br>Indice Ap journalier moyen : amplitude de la perturbation sur la journée. | `AVERAGE(journal_geomagnetique[ap])` | `0.0` |
| **Ap record** | `MAX(journal_geomagnetique[ap])` | `0` |
| **Journée la plus agitée**<br>Journée au plus fort indice Ap, puis au plus fort Kp en cas d'égalité (même règle que le Genie Agent). | `VAR _top = TOPN(1, journal_geomagnetique, journal_geomagnetique[ap], DESC, journal_geomagnetique[kp_max], DESC) RETURN FORMAT(MAXX(_top, journal_geomagnetique[jour]), "d mmmm yyyy", "fr-FR")` | `texte` |
| **Jours G4**<br>Jours de tempête sévère (Kp de 7+ à 8+). | `CALCULATE(COUNTROWS(journal_geomagnetique), KEEPFILTERS(journal_geomagnetique[classe_noaa] = "G4"))` | `#,0` |

**2. Soleil**

| Mesure et sens | DAX | Format |
| --- | --- | --- |
| **Taches solaires moyennes** | `AVERAGE(journal_geomagnetique[taches_solaires])` | `0.0` |
| **Taches solaires moyennes depuis 1749**<br>Moyenne mensuelle du nombre de taches solaires, série SILSO depuis 1749. | `AVERAGE(cycle_solaire_mensuel[taches_solaires])` | `0.0` |
| **Flux F10.7 moyen**<br>Flux radio solaire à 10,7 cm, mesuré depuis 1947. | `AVERAGE(journal_geomagnetique[flux_f107])` | `0.0` |
| **Éruptions** | `SUM(eruptions_mensuelles[eruptions])` | `#,0` |
| **Éruptions de classe X** | `CALCULATE([Éruptions], KEEPFILTERS(eruptions_mensuelles[lettre_classe] = "X"))` | `#,0` |
| **Éruptions de classe C** | `CALCULATE([Éruptions], KEEPFILTERS(eruptions_mensuelles[lettre_classe] = "C"))` | `#,0` |
| **Éruptions de classe M** | `CALCULATE([Éruptions], KEEPFILTERS(eruptions_mensuelles[lettre_classe] = "M"))` | `#,0` |

**3. Du Soleil à la Terre**

| Mesure et sens | DAX | Format |
| --- | --- | --- |
| **Tempêtes reliées à une CME** | `DISTINCTCOUNT(du_soleil_a_la_terre[gst_id])` | `#,0` |
| **CME géoeffectives**<br>Éjections de masse coronale reliées par la NASA à une tempête sur Terre. | `DISTINCTCOUNT(du_soleil_a_la_terre[cme_id])` | `#,0` |
| **Transit observé moyen (h)** | `AVERAGE(du_soleil_a_la_terre[transit_observe_h])` | `0.0` |
| **Transit le plus court (h)** | `MIN(du_soleil_a_la_terre[transit_observe_h])` | `0.0` |
| **Vitesse moyenne des CME (km/s)** | `AVERAGE(du_soleil_a_la_terre[vitesse_kms])` | `#,0` |
| **Écart moyen au trajet balistique (h)**<br>Positif : la CME a mis plus de temps que prévu à vitesse constante, elle a ralenti en route. | `AVERAGE(du_soleil_a_la_terre[ecart_h])` | `+0.0;-0.0;0.0` |

**4. Vent solaire**

| Mesure et sens | DAX | Format |
| --- | --- | --- |
| **Vitesse moyenne du vent (km/s)** | `AVERAGE(vent_solaire_horaire[vitesse_moy_kms])` | `#,0` |
| **Vitesse maximale du vent (km/s)** | `MAX(vent_solaire_horaire[vitesse_max_kms])` | `#,0` |
| **Bz minimal (nT)**<br>Composante nord-sud du champ magnétique interplanétaire. Sous -10 nT pendant plusieurs heures : risque de tempête. | `MIN(vent_solaire_horaire[bz_min_nt])` | `0.0` |
| **Pression dynamique maximale (nPa)** | `MAX(vent_solaire_horaire[pression_max_npa])` | `0.0` |
| **Couplage de Newell moyen**<br>Énergie transmise du vent solaire à la magnétosphère (Newell 2007). | `AVERAGE(vent_solaire_horaire[couplage_newell_moy])` | `#,0` |
| **Dernière mesure du vent** | `MAX(vent_solaire_horaire[heure])` | `dd/mm  hh:nn` |

**5. Kp toutes les 3 heures**

| Mesure et sens | DAX | Format |
| --- | --- | --- |
| **Kp le plus récent** | `VAR _derniere = MAX(kp_3h[debut_tranche]) RETURN CALCULATE(MAX(kp_3h[kp]), kp_3h[debut_tranche] = _derniere)` | `0.00` |
| **Tranches de 3 h en tempête forte** | `CALCULATE(COUNTROWS(kp_3h), KEEPFILTERS(kp_3h[classe_noaa] IN {"G4", "G5"}))` | `#,0` |

## Le rapport

Trois pages, dans `HELIOS_Meteo_Spatiale.Report`, avec le thème HÉLIOS :

| Page | Contenu |
| --- | --- |
| Un siècle de tempêtes géomagnétiques | 5 indicateurs, jours G4 et G5 par année, taches solaires, tempêtes fortes par cycle, segment par cycle |
| Du Soleil à la Terre | 6 indicateurs, vitesse d'une CME contre temps de trajet, éruptions par année, tempêtes par type de CME |
| Le vent solaire en direct | 6 indicateurs, vitesse, champ Bz, trois sondes comparées, couplage de Newell |

## Publier dans Microsoft Fabric

1. **Accueil**, **Publier**, choisissez votre espace de travail.
2. Dans l'espace, **…** du modèle sémantique, **Paramètres**, **Informations d'identification de la source de données** : **OAuth2**, niveau de confidentialité **Organisationnel**, **Se connecter**.
3. **Actualiser**, **Configurer une planification d'actualisation**, à une heure postérieure au job Databricks.
4. L'application [`06_fabric_app`](../06_fabric_app/) lit ce modèle en DAX : renseignez son identifiant et celui de l'espace dans `fabric.yaml`.
