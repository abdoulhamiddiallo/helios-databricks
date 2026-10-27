-- HÉLIOS · mise en place Unity Catalog
-- Prérequis : le catalogue helios existe (Catalog, Create, Create a catalog, Use default storage).
-- Exécuter dans le SQL Editor avec Run all.

CREATE SCHEMA IF NOT EXISTS helios.landing;
CREATE SCHEMA IF NOT EXISTS helios.bronze;
CREATE SCHEMA IF NOT EXISTS helios.silver;
CREATE SCHEMA IF NOT EXISTS helios.gold;
CREATE VOLUME IF NOT EXISTS helios.landing.brut;

COMMENT ON CATALOG helios IS 'HÉLIOS : observatoire de la météo spatiale, du Soleil à la Terre';
COMMENT ON SCHEMA helios.landing IS 'Fichiers bruts déposés par le collecteur';
COMMENT ON SCHEMA helios.bronze IS 'Copie fidèle des fichiers, une ligne par collecte';
COMMENT ON SCHEMA helios.silver IS 'Mesures nettoyées, dédoublonnées et historisées';
COMMENT ON SCHEMA helios.gold IS 'Indicateurs prêts pour Power BI';
COMMENT ON VOLUME helios.landing.brut IS 'Zone de dépôt des fichiers sources NOAA, NASA et GFZ';
ALTER CATALOG helios SET TAGS ('domaine' = 'meteo_spatiale', 'projet' = 'helios');

-- Vérification : bronze, gold, landing, silver doivent apparaître
SHOW SCHEMAS IN helios;
