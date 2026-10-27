-- HÉLIOS · jeux de données du tableau de bord AI/BI

-- Jeu 1 · journal géomagnétique
SELECT jour, annee, cycle, kp_max, classe_noaa, taches_solaires FROM helios.gold.journal_geomagnetique;

-- Jeu 2 · du Soleil à la Terre
SELECT * FROM helios.gold.du_soleil_a_la_terre;

-- Jeu 3 · vent solaire, 7 derniers jours
SELECT * FROM helios.gold.vent_solaire_horaire WHERE heure >= CURRENT_TIMESTAMP() - INTERVAL 7 DAYS;
