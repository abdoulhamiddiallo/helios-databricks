-- HÉLIOS · gold : indicateurs prêts pour Power BI

-- 1. Vent solaire heure par heure, sonde officielle, avec la physique du couplage
CREATE OR REFRESH MATERIALIZED VIEW helios.gold.vent_solaire_horaire
COMMENT 'Vent solaire heure par heure, sonde officielle, avec pression dynamique et couplage de Newell'
AS
WITH minute AS (
  SELECT v.time_tag, v.sonde, v.vitesse_kms, v.densite_cm3, m.bt_nt, m.by_gsm_nt, m.bz_gsm_nt
  FROM helios.silver.vent_solaire v
  JOIN helios.silver.champ_magnetique m
    ON v.time_tag = m.time_tag AND v.sonde = m.sonde
  WHERE v.sonde_active AND m.sonde_active
),
physique AS (
  SELECT *,
    1.6726e-6 * densite_cm3 * vitesse_kms * vitesse_kms AS pression_dynamique_npa,
    POWER(vitesse_kms, 4.0 / 3)
      * POWER(SQRT(by_gsm_nt * by_gsm_nt + bz_gsm_nt * bz_gsm_nt), 2.0 / 3)
      * POWER(ABS(SIN(ATAN2(by_gsm_nt, bz_gsm_nt) / 2)), 8.0 / 3) AS couplage_newell
  FROM minute
)
SELECT
  DATE_TRUNC('HOUR', time_tag)                                     AS heure,
  ARRAY_JOIN(ARRAY_SORT(COLLECT_SET(sonde)), ', ')                 AS sondes,
  COUNT(*)                                                         AS minutes_mesurees,
  ROUND(AVG(vitesse_kms), 1)                                       AS vitesse_moy_kms,
  ROUND(MAX(vitesse_kms), 1)                                       AS vitesse_max_kms,
  ROUND(AVG(densite_cm3), 2)                                       AS densite_moy_cm3,
  ROUND(MIN(bz_gsm_nt), 2)                                         AS bz_min_nt,
  ROUND(AVG(CASE WHEN bz_gsm_nt <= -10 THEN 1.0 ELSE 0.0 END), 3)  AS part_bz_sud_fort,
  ROUND(MAX(pression_dynamique_npa), 2)                            AS pression_max_npa,
  ROUND(AVG(couplage_newell), 0)                                   AS couplage_newell_moy
FROM physique
GROUP BY DATE_TRUNC('HOUR', time_tag);

-- 2. Même vent, trois sondes : écart de chaque sonde à la sonde officielle
CREATE OR REFRESH MATERIALIZED VIEW helios.gold.comparaison_sondes
COMMENT 'Vitesse et densité horaires par sonde, et écart à la sonde officielle'
AS
WITH horaire AS (
  SELECT DATE_TRUNC('HOUR', time_tag) AS heure, sonde,
         BOOL_OR(sonde_active) AS officielle,
         AVG(vitesse_kms) AS vitesse_kms, AVG(densite_cm3) AS densite_cm3, COUNT(*) AS minutes
  FROM helios.silver.vent_solaire
  GROUP BY DATE_TRUNC('HOUR', time_tag), sonde
),
reference AS (
  SELECT heure, MAX_BY(vitesse_kms, minutes) AS vitesse_ref_kms
  FROM horaire WHERE officielle
  GROUP BY heure
)
SELECT h.heure, h.sonde, h.officielle, h.minutes,
       ROUND(h.vitesse_kms, 1) AS vitesse_kms,
       ROUND(h.densite_cm3, 2) AS densite_cm3,
       ROUND(h.vitesse_kms - r.vitesse_ref_kms, 1) AS ecart_vitesse_kms
FROM horaire h
LEFT JOIN reference r ON h.heure = r.heure;

-- 3. Kp de 1932 à maintenant : GFZ pour l'historique, NOAA pour les dernières heures
CREATE OR REFRESH MATERIALIZED VIEW helios.gold.kp_3h
COMMENT 'Kp toutes les 3 heures depuis 1932, avec la classe de tempête NOAA'
AS
WITH gfz AS (
  SELECT debut_tranche, kp, 'GFZ Potsdam' AS source FROM helios.silver.kp_historique_3h
),
noaa AS (
  SELECT time_tag AS debut_tranche, kp, 'NOAA SWPC' AS source
  FROM helios.silver.kp_noaa
  WHERE time_tag > (SELECT MAX(debut_tranche) FROM helios.silver.kp_historique_3h)
),
tout AS (
  SELECT * FROM gfz UNION ALL SELECT * FROM noaa
)
SELECT
  debut_tranche,
  CAST(debut_tranche AS DATE) AS jour,
  ROUND(kp, 2) AS kp,
  source,
  CASE WHEN kp >= 9    THEN 'G5'
       WHEN kp >= 7.66 THEN 'G4'
       WHEN kp >= 6.66 THEN 'G3'
       WHEN kp >= 5.66 THEN 'G2'
       WHEN kp >= 4.66 THEN 'G1'
       ELSE 'Calme' END AS classe_noaa
FROM tout;

-- 4. Cycles solaires (dates des minimums)
CREATE OR REFRESH MATERIALIZED VIEW helios.gold.dim_cycles_solaires
COMMENT 'Cycles solaires numérotés, du minimum de début au minimum de fin'
AS
SELECT * FROM VALUES
  (16, DATE'1923-08-01', DATE'1933-09-01'),
  (17, DATE'1933-09-01', DATE'1944-02-01'),
  (18, DATE'1944-02-01', DATE'1954-04-01'),
  (19, DATE'1954-04-01', DATE'1964-10-01'),
  (20, DATE'1964-10-01', DATE'1976-03-01'),
  (21, DATE'1976-03-01', DATE'1986-09-01'),
  (22, DATE'1986-09-01', DATE'1996-08-01'),
  (23, DATE'1996-08-01', DATE'2008-12-01'),
  (24, DATE'2008-12-01', DATE'2019-12-01'),
  (25, DATE'2019-12-01', DATE'2031-01-01')
AS cycles(cycle, debut, fin);

-- 5. Journal géomagnétique : un jour par ligne depuis 1932
CREATE OR REFRESH MATERIALIZED VIEW helios.gold.journal_geomagnetique
COMMENT 'Un jour par ligne depuis 1932 : Kp max, classe NOAA, Ap, taches solaires, flux F10.7, cycle'
AS
WITH jours AS (
  SELECT jour, MAX(kp) AS kp_max FROM helios.gold.kp_3h GROUP BY jour
),
gfz AS (
  SELECT jour,
         MAX(ap_jour) AS ap,
         MAX(taches_solaires_jour) AS taches_solaires,
         MAX(flux_f107_obs) AS flux_f107
  FROM helios.silver.kp_historique_3h
  GROUP BY jour
)
SELECT
  j.jour,
  YEAR(j.jour) AS annee,
  c.cycle,
  ROUND(j.kp_max, 2) AS kp_max,
  CASE WHEN j.kp_max >= 9    THEN 'G5'
       WHEN j.kp_max >= 7.66 THEN 'G4'
       WHEN j.kp_max >= 6.66 THEN 'G3'
       WHEN j.kp_max >= 5.66 THEN 'G2'
       WHEN j.kp_max >= 4.66 THEN 'G1'
       ELSE 'Calme' END AS classe_noaa,
  g.ap,
  g.taches_solaires,
  g.flux_f107
FROM jours j
LEFT JOIN gfz g ON j.jour = g.jour
LEFT JOIN helios.gold.dim_cycles_solaires c ON j.jour >= c.debut AND j.jour < c.fin;

-- 6. Du Soleil à la Terre : chaque tempête reliée à la CME qui l'a causée
CREATE OR REFRESH MATERIALIZED VIEW helios.gold.du_soleil_a_la_terre
COMMENT 'Tempêtes DONKI reliées à leurs CME : temps de trajet observé contre trajet balistique'
AS
WITH tempetes AS (
  SELECT gst_id, debut_tempete, kp_max, EXPLODE(evenements_lies) AS evenement
  FROM helios.silver.donki_gst
),
cme AS (
  SELECT cme_id, depart_soleil, vitesse_kms, demi_angle_deg, type_cme, position_source, region_active, lien_nasa
  FROM helios.silver.donki_cme
  WHERE __END_AT IS NULL
)
SELECT
  t.gst_id,
  c.cme_id,
  c.depart_soleil,
  t.debut_tempete,
  t.kp_max,
  c.vitesse_kms,
  c.demi_angle_deg,
  c.type_cme,
  c.position_source,
  c.region_active,
  ROUND((UNIX_TIMESTAMP(t.debut_tempete) - UNIX_TIMESTAMP(c.depart_soleil)) / 3600, 1) AS transit_observe_h,
  ROUND(149597870.7 / c.vitesse_kms / 3600, 1) AS transit_balistique_h,
  ROUND((UNIX_TIMESTAMP(t.debut_tempete) - UNIX_TIMESTAMP(c.depart_soleil)) / 3600
        - 149597870.7 / c.vitesse_kms / 3600, 1) AS ecart_h,
  c.lien_nasa
FROM tempetes t
JOIN cme c ON t.evenement = c.cme_id;

-- 7. Éruptions solaires par mois et par classe
CREATE OR REFRESH MATERIALIZED VIEW helios.gold.eruptions_mensuelles
COMMENT 'Éruptions solaires DONKI par mois et par classe, avec le flux maximal'
AS
SELECT
  CAST(DATE_TRUNC('MONTH', pic) AS DATE) AS mois,
  lettre_classe,
  COUNT(*) AS eruptions,
  MAX(flux_pic_wm2) AS flux_max_wm2,
  MAX_BY(classe, flux_pic_wm2) AS plus_forte
FROM helios.silver.donki_flr
GROUP BY CAST(DATE_TRUNC('MONTH', pic) AS DATE), lettre_classe;
