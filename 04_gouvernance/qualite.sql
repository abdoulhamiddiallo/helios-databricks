-- HÉLIOS · qualité mesurée par les expectations (journal d'événements du pipeline)
SELECT
  timestamp,
  origin.flow_name AS flux,
  details:flow_progress.data_quality.expectations AS controles
FROM event_log(TABLE(helios.silver.vent_solaire))
WHERE event_type = 'flow_progress'
  AND details:flow_progress.data_quality IS NOT NULL
ORDER BY timestamp DESC
LIMIT 20;
