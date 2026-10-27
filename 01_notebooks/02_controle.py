# Databricks notebook source
# MAGIC %md
# MAGIC # HÉLIOS · 02_controle
# MAGIC Dernière tâche du job : échoue si les données ne sont pas fraîches ou incohérentes.

# COMMAND ----------

# HÉLIOS · 02_controle : le job échoue si les données ne sont pas fraîches ou incohérentes

controles = spark.sql("""
  SELECT
    (SELECT TIMESTAMPDIFF(MINUTE, MAX(time_tag), CURRENT_TIMESTAMP()) FROM helios.silver.vent_solaire) AS retard_vent_min,
    (SELECT TIMESTAMPDIFF(HOUR, MAX(debut_tranche), CURRENT_TIMESTAMP()) FROM helios.gold.kp_3h)       AS retard_kp_h,
    (SELECT COUNT(*) FROM helios.gold.journal_geomagnetique)                                           AS jours_historique,
    (SELECT COUNT(*) FROM helios.gold.du_soleil_a_la_terre)                                            AS liens_cme_tempete
""").first()

print(controles.asDict())

erreurs = []
if controles.retard_vent_min is None or controles.retard_vent_min > 360:
    erreurs.append(f"Vent solaire en retard de {controles.retard_vent_min} minutes")
if controles.retard_kp_h is None or controles.retard_kp_h > 12:
    erreurs.append(f"Kp en retard de {controles.retard_kp_h} heures")
if controles.jours_historique < 34000:
    erreurs.append(f"Historique incomplet : {controles.jours_historique} jours au lieu de 34 000 et plus")
if controles.liens_cme_tempete == 0:
    erreurs.append("Aucun lien CME vers tempête : vérifier DONKI")

if erreurs:
    raise Exception(" | ".join(erreurs))
print("Tous les contrôles HÉLIOS sont au vert")
