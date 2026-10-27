# HÉLIOS · bronze : ingestion incrémentale des fichiers déposés par le collecteur (Auto Loader)
from pyspark import pipelines as dp
from pyspark.sql import functions as F

BRUT = "/Volumes/helios/landing/brut"
ENVELOPPE = "source STRING, url STRING, fetched_at STRING, sha256 STRING, payload STRING"


def lire_enveloppes(famille):
    return (
        spark.readStream.format("cloudFiles")
        .option("cloudFiles.format", "json")
        .schema(ENVELOPPE)
        .load(f"{BRUT}/{famille}/*/*.json")
        .select(
            "*",
            F.col("_metadata.file_path").alias("fichier"),
            F.current_timestamp().alias("ingere_le"),
        )
    )


@dp.table(name="helios.bronze.swpc", comment="Réponses brutes NOAA SWPC, une ligne par fichier collecté")
@dp.expect_or_fail("enveloppe_complete", "source IS NOT NULL AND payload IS NOT NULL")
def bronze_swpc():
    return lire_enveloppes("swpc")


@dp.table(name="helios.bronze.donki", comment="Réponses brutes NASA DONKI, une ligne par fichier collecté")
@dp.expect_or_fail("enveloppe_complete", "source IS NOT NULL AND payload IS NOT NULL")
def bronze_donki():
    return lire_enveloppes("donki")


@dp.table(name="helios.bronze.gfz_lignes", comment="Fichier GFZ Kp depuis 1932, une ligne de texte par ligne de fichier")
def bronze_gfz():
    return (
        spark.readStream.format("cloudFiles")
        .option("cloudFiles.format", "text")
        .load(f"{BRUT}/gfz/kp_depuis_1932/*.txt")
        .select(
            F.col("value").alias("ligne"),
            F.col("_metadata.file_path").alias("fichier"),
            F.current_timestamp().alias("ingere_le"),
        )
    )
