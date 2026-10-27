# Databricks notebook source
# MAGIC %md
# MAGIC # HÉLIOS · 00_explorer
# MAGIC Regarder les quatre sources avant de les intégrer. N'écrit rien dans Databricks.

# COMMAND ----------

# Cellule 1 : tester l'accès à Internet et regarder le vent solaire
import json
import requests

reponse = requests.get("https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json", timeout=60)
print("Code HTTP :", reponse.status_code)
mesures = reponse.json()
print("Nombre de mesures :", len(mesures))
print(json.dumps(mesures[:2], indent=2))

# COMMAND ----------

# Cellule 2 : combien de mesures par sonde, et laquelle est officielle
import pandas as pd

df = pd.DataFrame(mesures)
display(df[["time_tag", "source", "active", "proton_speed", "proton_density"]].head(12))
print(df.groupby("source")["active"].agg(minutes="count", minutes_officielles="sum"))

# COMMAND ----------

# Cellule 3 : la tempête de mai 2024 vue par la NASA (DONKI)
reponse = requests.get(
    "https://ccmc.gsfc.nasa.gov/DONKI-API/get/GST?startDate=2024-05-08&endDate=2024-05-12",
    timeout=60,
)
for tempete in reponse.json():
    kp_max = max(k["kpIndex"] for k in tempete["allKpIndex"])
    causes = [e["activityID"] for e in (tempete["linkedEvents"] or [])]
    print(tempete["gstID"], "| Kp max :", kp_max, "| version :", tempete["versionId"])
    print("   causée par :", causes)

# COMMAND ----------

# Cellule 4 : le fichier GFZ Potsdam, Kp depuis 1932
texte = requests.get("https://kp.gfz.de/app/files/Kp_ap_Ap_SN_F107_since_1932.txt", timeout=120).text
lignes = texte.splitlines()
donnees = [ligne for ligne in lignes if not ligne.startswith("#")]
print("Taille :", round(len(texte) / 1e6, 1), "Mo | lignes de données :", len(donnees))
print("Première ligne :", donnees[0])
print("Dernière ligne :", donnees[-1])
print("Le 10 mai 2024 :", next(l for l in donnees if l.startswith("2024 05 10")))
