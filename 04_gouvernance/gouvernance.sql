-- HÉLIOS · tags et droits (moindre privilège)
ALTER SCHEMA helios.gold SET TAGS ('couche' = 'gold', 'usage' = 'power_bi');
ALTER SCHEMA helios.silver SET TAGS ('couche' = 'silver');
ALTER SCHEMA helios.bronze SET TAGS ('couche' = 'bronze');

-- Les lecteurs du compte voient seulement la couche gold
GRANT USE CATALOG ON CATALOG helios TO `account users`;
GRANT USE SCHEMA, SELECT ON SCHEMA helios.gold TO `account users`;

-- Tags de source et de licence sur les tables silver
ALTER TABLE helios.silver.vent_solaire SET TAGS ('source' = 'NOAA SWPC', 'licence' = 'domaine public');
ALTER TABLE helios.silver.champ_magnetique SET TAGS ('source' = 'NOAA SWPC', 'licence' = 'domaine public');
ALTER TABLE helios.silver.donki_cme SET TAGS ('source' = 'NASA CCMC DONKI', 'licence' = 'domaine public');
ALTER TABLE helios.silver.donki_gst SET TAGS ('source' = 'NASA CCMC DONKI', 'licence' = 'domaine public');
ALTER TABLE helios.silver.donki_flr SET TAGS ('source' = 'NASA CCMC DONKI', 'licence' = 'domaine public');
ALTER TABLE helios.silver.kp_historique_3h SET TAGS ('source' = 'GFZ Potsdam', 'licence' = 'CC BY 4.0');
