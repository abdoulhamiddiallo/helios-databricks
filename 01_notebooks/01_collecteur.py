# Databricks notebook source
# MAGIC %md
# MAGIC # HÉLIOS · 01_collecteur
# MAGIC Télécharge NOAA SWPC, NASA DONKI et GFZ Potsdam et dépose chaque réponse, intacte, dans /Volumes/helios/landing/brut.
# MAGIC 
# MAGIC Reprise historique : widget donki_depuis = 2010-01-01 et gfz = oui, puis Run all. Ensuite : donki_depuis vide et gfz = auto.

# COMMAND ----------

# Cellule 1 : réglages modifiables (widgets en haut du notebook)
dbutils.widgets.text("donki_jours", "30", "DONKI : jours glissants")
dbutils.widgets.text("donki_depuis", "", "DONKI : reprise historique depuis (AAAA-MM-JJ)")
dbutils.widgets.dropdown("gfz", "auto", ["auto", "oui", "non"], "GFZ 1932 : collecter")

# COMMAND ----------

# Cellule 2 : constantes, adresses des sources, horodatage de la collecte
import datetime as dt
import hashlib
import json
import os
import time

import requests

VOLUME = "/Volumes/helios/landing/brut"
ENTETES = {"User-Agent": "HELIOS-lakehouse/1.0 (projet pedagogique data engineering)"}
MAINTENANT = dt.datetime.now(dt.timezone.utc)
HORODATAGE = MAINTENANT.strftime("%Y%m%dT%H%M%SZ")
COLLECTE_LE = MAINTENANT.strftime("%Y-%m-%dT%H:%M:%SZ")

SWPC = {
    "vent_solaire": "https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json",
    "champ_magnetique": "https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json",
    "kp_noaa": "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
    "rayons_x": "https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json",
    "cycle_solaire": "https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json",
}
DONKI = "https://ccmc.gsfc.nasa.gov/DONKI-API/get/{type}?startDate={debut}&endDate={fin}"
DONKI_TYPES = ["CME", "GST", "FLR"]
GFZ = "https://kp.gfz.de/app/files/Kp_ap_Ap_SN_F107_since_1932.txt"

bilan = []
print("Collecte du", COLLECTE_LE)

# COMMAND ----------

# Cellule 3 : téléchargement avec nouvelles tentatives et attente exponentielle
def telecharger(url, essais=4):
    for essai in range(1, essais + 1):
        try:
            reponse = requests.get(url, headers=ENTETES, timeout=90)
        except requests.RequestException as erreur:
            if essai == essais:
                raise RuntimeError(f"Échec réseau après {essais} essais : {url}") from erreur
            time.sleep(5 * 2 ** essai)
            continue
        if 400 <= reponse.status_code < 500:
            raise RuntimeError(f"La source refuse la requête ({reponse.status_code}) : {reponse.text[:200]} | {url}")
        if reponse.status_code >= 500:
            if essai == essais:
                raise RuntimeError(f"Serveur en erreur ({reponse.status_code}) après {essais} essais : {url}")
            time.sleep(5 * 2 ** essai)
            continue
        return reponse.text

# COMMAND ----------

# Cellule 4 : écrire la réponse brute dans le volume, emballée avec ses métadonnées
def deposer_enveloppe(famille, source, url, contenu, suffixe=""):
    dossier = f"{VOLUME}/{famille}/{source}"
    os.makedirs(dossier, exist_ok=True)
    enveloppe = {
        "source": source,
        "url": url,
        "fetched_at": COLLECTE_LE,
        "sha256": hashlib.sha256(contenu.encode("utf-8")).hexdigest(),
        "payload": contenu,
    }
    chemin = f"{dossier}/{source}{suffixe}_{HORODATAGE}.json"
    with open(chemin, "w", encoding="utf-8") as fichier:
        json.dump(enveloppe, fichier, ensure_ascii=False)
    bilan.append((famille, source + suffixe, round(len(contenu) / 1e6, 2), chemin))

# COMMAND ----------

# Cellule 5 : NOAA SWPC (vent solaire, champ magnétique, Kp, rayons X, cycle solaire)
for source, url in SWPC.items():
    deposer_enveloppe("swpc", source, url, telecharger(url))
    print("Déposé :", source)

# COMMAND ----------

# Cellule 6 : NASA DONKI (CME, tempêtes, éruptions), par fenêtres de 60 jours au plus
aujourdhui = MAINTENANT.date()
if dbutils.widgets.get("donki_depuis"):
    debut = dt.date.fromisoformat(dbutils.widgets.get("donki_depuis"))
else:
    debut = aujourdhui - dt.timedelta(days=int(dbutils.widgets.get("donki_jours")))

fenetres = []
while debut <= aujourdhui:
    fin = min(debut + dt.timedelta(days=59), aujourdhui)
    fenetres.append((debut, fin))
    debut = fin + dt.timedelta(days=1)
print("Fenêtres à interroger par type :", len(fenetres))

for type_evenement in DONKI_TYPES:
    for debut, fin in fenetres:
        url = DONKI.format(type=type_evenement, debut=debut, fin=fin)
        contenu = telecharger(url).strip() or "[]"
        deposer_enveloppe("donki", f"donki_{type_evenement}", url, contenu, suffixe=f"_{debut:%Y%m%d}")
        time.sleep(1)
    print("Déposé :", type_evenement, len(fenetres), "fichier(s)")

# COMMAND ----------

# Cellule 7 : GFZ Potsdam (premier passage, puis chaque lundi) et bilan de la collecte
dossier_gfz = f"{VOLUME}/gfz/kp_depuis_1932"
os.makedirs(dossier_gfz, exist_ok=True)
choix = dbutils.widgets.get("gfz")
deja_present = len(os.listdir(dossier_gfz)) > 0
if choix == "oui" or (choix == "auto" and (not deja_present or MAINTENANT.weekday() == 0)):
    texte = telecharger(GFZ)
    chemin = f"{dossier_gfz}/kp_depuis_1932_{HORODATAGE}.txt"
    with open(chemin, "w", encoding="utf-8") as fichier:
        fichier.write(texte)
    bilan.append(("gfz", "kp_depuis_1932", round(len(texte) / 1e6, 2), chemin))

display(spark.createDataFrame(bilan, "famille string, source string, taille_mo double, fichier string"))
