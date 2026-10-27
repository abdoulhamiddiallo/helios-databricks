# HÉLIOS · silver NOAA : vent solaire, champ magnétique, Kp, rayons X, cycle solaire
from pyspark import pipelines as dp
from pyspark.sql import functions as F
from pyspark.sql.types import (
    ArrayType, BooleanType, DoubleType, IntegerType, StringType, StructField, StructType,
)


def liste_de(*champs):
    return ArrayType(StructType([StructField(nom, type_) for nom, type_ in champs]))


def mesures_swpc(source, schema):
    return (
        spark.readStream.table("helios.bronze.swpc")
        .where(F.col("source") == source)
        .select(
            F.to_timestamp("fetched_at").alias("collecte_le"),
            F.explode(F.from_json("payload", schema)).alias("m"),
        )
    )


# ---------- Vent solaire : trois sondes, minute par minute ----------
VENT = liste_de(
    ("time_tag", StringType()), ("source", StringType()), ("active", BooleanType()),
    ("proton_speed", DoubleType()), ("proton_density", DoubleType()),
    ("proton_temperature", DoubleType()), ("overall_quality", IntegerType()),
)


@dp.temporary_view(name="v_vent_solaire")
@dp.expect_or_drop("cle_complete", "time_tag IS NOT NULL AND sonde IS NOT NULL")
@dp.expect("vitesse_plausible", "vitesse_kms IS NULL OR vitesse_kms BETWEEN 200 AND 3000")
@dp.expect("densite_plausible", "densite_cm3 IS NULL OR densite_cm3 BETWEEN 0 AND 150")
def v_vent_solaire():
    return mesures_swpc("vent_solaire", VENT).select(
        F.to_timestamp("m.time_tag").alias("time_tag"),
        F.col("m.source").alias("sonde"),
        F.col("m.active").alias("sonde_active"),
        F.col("m.proton_speed").alias("vitesse_kms"),
        F.col("m.proton_density").alias("densite_cm3"),
        F.col("m.proton_temperature").alias("temperature_k"),
        F.col("m.overall_quality").alias("qualite"),
        "collecte_le",
    )


dp.create_streaming_table(
    name="helios.silver.vent_solaire",
    comment="Vent solaire minute par minute, une ligne par sonde (SOLAR1, ACE, IMAP), sans doublon entre collectes",
)
dp.create_auto_cdc_flow(
    target="helios.silver.vent_solaire", source="v_vent_solaire",
    keys=["time_tag", "sonde"], sequence_by="collecte_le", stored_as_scd_type=1,
)

# ---------- Champ magnétique interplanétaire ----------
MAG = liste_de(
    ("time_tag", StringType()), ("source", StringType()), ("active", BooleanType()),
    ("bt", DoubleType()), ("bx_gsm", DoubleType()), ("by_gsm", DoubleType()),
    ("bz_gsm", DoubleType()), ("overall_quality", IntegerType()),
)


@dp.temporary_view(name="v_champ_magnetique")
@dp.expect_or_drop("cle_complete", "time_tag IS NOT NULL AND sonde IS NOT NULL")
@dp.expect("bt_plausible", "bt_nt IS NULL OR bt_nt BETWEEN 0 AND 200")
def v_champ_magnetique():
    return mesures_swpc("champ_magnetique", MAG).select(
        F.to_timestamp("m.time_tag").alias("time_tag"),
        F.col("m.source").alias("sonde"),
        F.col("m.active").alias("sonde_active"),
        F.col("m.bt").alias("bt_nt"),
        F.col("m.bx_gsm").alias("bx_gsm_nt"),
        F.col("m.by_gsm").alias("by_gsm_nt"),
        F.col("m.bz_gsm").alias("bz_gsm_nt"),
        F.col("m.overall_quality").alias("qualite"),
        "collecte_le",
    )


dp.create_streaming_table(
    name="helios.silver.champ_magnetique",
    comment="Champ magnétique interplanétaire (repère GSM) minute par minute et par sonde",
)
dp.create_auto_cdc_flow(
    target="helios.silver.champ_magnetique", source="v_champ_magnetique",
    keys=["time_tag", "sonde"], sequence_by="collecte_le", stored_as_scd_type=1,
)

# ---------- Kp NOAA (7 derniers jours) ----------
KP = liste_de(
    ("time_tag", StringType()), ("Kp", DoubleType()),
    ("a_running", IntegerType()), ("station_count", IntegerType()),
)


@dp.temporary_view(name="v_kp_noaa")
@dp.expect_or_drop("kp_valide", "time_tag IS NOT NULL AND kp BETWEEN 0 AND 9")
def v_kp_noaa():
    return mesures_swpc("kp_noaa", KP).select(
        F.to_timestamp("m.time_tag").alias("time_tag"),
        F.col("m.Kp").alias("kp"),
        F.col("m.a_running").alias("a_courant"),
        F.col("m.station_count").alias("nb_stations"),
        "collecte_le",
    )


dp.create_streaming_table(name="helios.silver.kp_noaa", comment="Indice Kp planétaire NOAA, toutes les 3 heures")
dp.create_auto_cdc_flow(
    target="helios.silver.kp_noaa", source="v_kp_noaa",
    keys=["time_tag"], sequence_by="collecte_le", stored_as_scd_type=1,
)

# ---------- Rayons X GOES : éruptions solaires minute par minute ----------
XRAY = liste_de(
    ("time_tag", StringType()), ("satellite", IntegerType()),
    ("flux", DoubleType()), ("energy", StringType()),
)


@dp.temporary_view(name="v_rayons_x")
@dp.expect_or_drop("flux_positif", "time_tag IS NOT NULL AND flux_wm2 > 0")
def v_rayons_x():
    flux = F.col("m.flux")
    return (
        mesures_swpc("rayons_x", XRAY)
        .where(F.col("m.energy") == "0.1-0.8nm")
        .select(
            F.to_timestamp("m.time_tag").alias("time_tag"),
            F.col("m.satellite").alias("satellite_goes"),
            flux.alias("flux_wm2"),
            F.when(flux >= 1e-4, "X").when(flux >= 1e-5, "M").when(flux >= 1e-6, "C")
             .when(flux >= 1e-7, "B").otherwise("A").alias("classe"),
            "collecte_le",
        )
    )


dp.create_streaming_table(name="helios.silver.rayons_x", comment="Flux de rayons X GOES 0,1 à 0,8 nm et classe d'éruption")
dp.create_auto_cdc_flow(
    target="helios.silver.rayons_x", source="v_rayons_x",
    keys=["time_tag"], sequence_by="collecte_le", stored_as_scd_type=1,
)

# ---------- Cycle solaire mensuel depuis 1749 (dernier fichier collecté) ----------
CYCLE = liste_de(("time-tag", StringType()), ("ssn", DoubleType()), ("f10.7", DoubleType()))


@dp.materialized_view(name="helios.silver.cycle_solaire_mensuel", comment="Taches solaires et flux F10.7 par mois depuis 1749")
def cycle_solaire_mensuel():
    bronze = spark.read.table("helios.bronze.swpc").where("source = 'cycle_solaire'")
    dernier = bronze.groupBy().agg(F.max("fetched_at").alias("fetched_at"))
    m = F.col("m")
    return (
        bronze.join(dernier, "fetched_at")
        .select(F.explode(F.from_json("payload", CYCLE)).alias("m"))
        .select(
            F.to_date(F.concat(m.getField("time-tag"), F.lit("-01"))).alias("mois"),
            F.when(m.getField("ssn") >= 0, m.getField("ssn")).alias("taches_solaires"),
            F.when(m.getField("f10.7") >= 0, m.getField("f10.7")).alias("flux_f107"),
        )
    )
