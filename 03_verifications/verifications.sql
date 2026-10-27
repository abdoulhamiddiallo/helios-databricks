-- HÉLIOS · requêtes de vérification, étape par étape (SQL Editor)

-- Étape 1 · l'espace répond
SHOW CATALOGS;

-- Étape 3 · les fichiers sont dans le volume (avant toute table)
LIST '/Volumes/helios/landing/brut/swpc/vent_solaire/';

SELECT source, fetched_at, sha256, LENGTH(payload) AS taille_en_caracteres
FROM read_files('/Volumes/helios/landing/brut/swpc/*/*.json', format => 'json');

SELECT source, COUNT(*) AS fichiers
FROM read_files('/Volumes/helios/landing/brut/donki/*/*.json', format => 'json')
GROUP BY source;

-- Étape 4 · couche bronze
SELECT 'swpc' AS table_bronze, COUNT(*) AS lignes FROM helios.bronze.swpc
UNION ALL SELECT 'donki', COUNT(*) FROM helios.bronze.donki
UNION ALL SELECT 'gfz_lignes', COUNT(*) FROM helios.bronze.gfz_lignes;

-- Étape 5 · couche silver
SELECT sonde, COUNT(*) AS minutes, MIN(time_tag) AS debut, MAX(time_tag) AS fin
FROM helios.silver.vent_solaire
GROUP BY sonde;

SELECT MIN(jour) AS premier_jour, MAX(jour) AS dernier_jour, COUNT(*) AS tranches_3h, MAX(kp) AS kp_record
FROM helios.silver.kp_historique_3h;

SELECT gst_id, debut_tempete, kp_max, evenements_lies
FROM helios.silver.donki_gst
WHERE debut_tempete BETWEEN '2024-05-09' AND '2024-05-12';

-- Étape 6 · couche gold : le fil rouge du 10 mai 2024
SELECT cme_id, depart_soleil, debut_tempete, kp_max, vitesse_kms,
       transit_observe_h, transit_balistique_h, ecart_h
FROM helios.gold.du_soleil_a_la_terre
WHERE debut_tempete BETWEEN '2024-05-09' AND '2024-05-12'
ORDER BY depart_soleil;

SELECT jour, kp_max, classe_noaa, cycle, taches_solaires
FROM helios.gold.journal_geomagnetique
ORDER BY kp_max DESC, jour
LIMIT 10;
