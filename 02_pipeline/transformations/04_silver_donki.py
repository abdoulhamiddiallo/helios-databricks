# HÉLIOS · silver DONKI : CME (historisées en type 2), tempêtes et éruptions
from pyspark import pipelines as dp
from pyspark.sql import functions as F
from pyspark.sql.types import (
    ArrayType, BooleanType, DoubleType, IntegerType, StringType, StructField, StructType,
)


def liste_de(*champs):
    return ArrayType(StructType([StructField(nom, type_) for nom, type_ in champs]))


def evenements_donki(source, schema):
    return (
        spark.readStream.table("helios.bronze.donki")
        .where(F.col("source") == source)
        .select(
            F.to_timestamp("fetched_at").alias("collecte_le"),
            F.explode(F.from_json("payload", schema)).alias("e"),
        )
    )


def horodatage_donki(colonne):
    return F.try_to_timestamp(F.col(colonne), F.lit("yyyy-MM-dd'T'HH:mm'Z'"))


LIENS = liste_de(("activityID", StringType()))

# ---------- Éjections de masse coronale (CME), historisées en type 2 ----------
ANALYSE = liste_de(
    ("isMostAccurate", BooleanType()), ("speed", DoubleType()),
    ("halfAngle", DoubleType()), ("type", StringType()),
)
CME = liste_de(
    ("activityID", StringType()), ("startTime", StringType()), ("sourceLocation", StringType()),
    ("activeRegionNum", IntegerType()), ("versionId", IntegerType()), ("link", StringType()),
    ("cmeAnalyses", ANALYSE), ("linkedEvents", LIENS),
)


@dp.temporary_view(name="v_cme")
@dp.expect_or_drop("cme_identifiee", "cme_id IS NOT NULL AND depart_soleil IS NOT NULL")
@dp.expect("vitesse_plausible", "vitesse_kms IS NULL OR vitesse_kms BETWEEN 50 AND 4000")
def v_cme():
    return (
        evenements_donki("donki_CME", CME)
        .withColumn("analyse", F.expr("try_element_at(filter(e.cmeAnalyses, a -> a.isMostAccurate), 1)"))
        .select(
            F.col("e.activityID").alias("cme_id"),
            horodatage_donki("e.startTime").alias("depart_soleil"),
            F.col("e.sourceLocation").alias("position_source"),
            F.col("e.activeRegionNum").alias("region_active"),
            F.col("analyse.speed").alias("vitesse_kms"),
            F.col("analyse.halfAngle").alias("demi_angle_deg"),
            F.col("analyse.type").alias("type_cme"),
            F.expr("transform(e.linkedEvents, l -> l.activityID)").alias("evenements_lies"),
            F.col("e.versionId").alias("version"),
            F.col("e.link").alias("lien_nasa"),
            "collecte_le",
        )
    )


dp.create_streaming_table(
    name="helios.silver.donki_cme",
    comment="Éjections de masse coronale, historisées (type 2) à chaque révision publiée par la NASA",
)
dp.create_auto_cdc_flow(
    target="helios.silver.donki_cme", source="v_cme", keys=["cme_id"],
    sequence_by=F.struct("version", "collecte_le"), stored_as_scd_type=2,
    track_history_except_column_list=["collecte_le"],
)

# ---------- Tempêtes géomagnétiques (GST) ----------
GST = liste_de(
    ("gstID", StringType()), ("startTime", StringType()), ("versionId", IntegerType()),
    ("link", StringType()), ("linkedEvents", LIENS),
    ("allKpIndex", liste_de(("observedTime", StringType()), ("kpIndex", DoubleType()))),
)


@dp.temporary_view(name="v_gst")
@dp.expect_or_drop("tempete_identifiee", "gst_id IS NOT NULL AND debut_tempete IS NOT NULL")
def v_gst():
    return evenements_donki("donki_GST", GST).select(
        F.col("e.gstID").alias("gst_id"),
        horodatage_donki("e.startTime").alias("debut_tempete"),
        F.expr("array_max(transform(e.allKpIndex, k -> k.kpIndex))").alias("kp_max"),
        F.expr("transform(e.linkedEvents, l -> l.activityID)").alias("evenements_lies"),
        F.col("e.versionId").alias("version"),
        F.col("e.link").alias("lien_nasa"),
        "collecte_le",
    )


dp.create_streaming_table(name="helios.silver.donki_gst", comment="Tempêtes géomagnétiques DONKI et événements qui les ont causées")
dp.create_auto_cdc_flow(
    target="helios.silver.donki_gst", source="v_gst", keys=["gst_id"],
    sequence_by=F.struct("version", "collecte_le"), stored_as_scd_type=1,
)

# ---------- Éruptions solaires (FLR) ----------
FLR = liste_de(
    ("flrID", StringType()), ("beginTime", StringType()), ("peakTime", StringType()),
    ("endTime", StringType()), ("classType", StringType()), ("sourceLocation", StringType()),
    ("activeRegionNum", IntegerType()), ("versionId", IntegerType()), ("link", StringType()),
    ("linkedEvents", LIENS),
)


@dp.temporary_view(name="v_flr")
@dp.expect_or_drop("eruption_identifiee", "flr_id IS NOT NULL AND pic IS NOT NULL")
@dp.expect("classe_lisible", "lettre_classe IN ('A', 'B', 'C', 'M', 'X')")
def v_flr():
    classe = F.col("e.classType")
    lettre = F.upper(F.substring(classe, 1, 1))
    base = (
        F.when(lettre == "X", 1e-4).when(lettre == "M", 1e-5).when(lettre == "C", 1e-6)
        .when(lettre == "B", 1e-7).when(lettre == "A", 1e-8)
    )
    return evenements_donki("donki_FLR", FLR).select(
        F.col("e.flrID").alias("flr_id"),
        horodatage_donki("e.beginTime").alias("debut"),
        horodatage_donki("e.peakTime").alias("pic"),
        horodatage_donki("e.endTime").alias("fin"),
        classe.alias("classe"),
        lettre.alias("lettre_classe"),
        (base * F.expr("try_cast(substring(e.classType, 2) AS DOUBLE)")).alias("flux_pic_wm2"),
        F.col("e.sourceLocation").alias("position_source"),
        F.col("e.activeRegionNum").alias("region_active"),
        F.expr("transform(e.linkedEvents, l -> l.activityID)").alias("evenements_lies"),
        F.col("e.versionId").alias("version"),
        F.col("e.link").alias("lien_nasa"),
        "collecte_le",
    )


dp.create_streaming_table(name="helios.silver.donki_flr", comment="Éruptions solaires DONKI avec classe et flux au pic")
dp.create_auto_cdc_flow(
    target="helios.silver.donki_flr", source="v_flr", keys=["flr_id"],
    sequence_by=F.struct("version", "collecte_le"), stored_as_scd_type=1,
)
