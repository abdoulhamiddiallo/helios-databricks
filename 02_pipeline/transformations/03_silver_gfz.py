# HÉLIOS · silver GFZ : Kp toutes les 3 heures depuis 1932, depuis un fichier texte à colonnes
from pyspark import pipelines as dp
from pyspark.sql import functions as F


@dp.materialized_view(
    name="helios.silver.kp_historique_3h",
    comment="Kp toutes les 3 heures depuis 1932 (GFZ Potsdam), dernier fichier collecté",
)
@dp.expect_or_drop("kp_mesure", "kp >= 0")
def kp_historique_3h():
    lignes = spark.read.table("helios.bronze.gfz_lignes")
    dernier = lignes.groupBy().agg(F.max("fichier").alias("fichier"))
    colonnes = F.split(F.trim(F.col("ligne")), r"\s+")
    c = F.col("c")
    jours = (
        lignes.join(dernier, "fichier")
        .where(~F.col("ligne").startswith("#") & (F.length(F.trim("ligne")) > 0))
        .select(colonnes.alias("c"))
    )

    def positif(expr):
        return F.when(expr >= 0, expr)

    return (
        jours.select(
            F.make_date(c[0].cast("int"), c[1].cast("int"), c[2].cast("int")).alias("jour"),
            F.posexplode(F.array(*[c[7 + i].cast("double") for i in range(8)])).alias("tranche", "kp"),
            positif(c[23].cast("int")).alias("ap_jour"),
            positif(c[24].cast("int")).alias("taches_solaires_jour"),
            positif(c[25].cast("double")).alias("flux_f107_obs"),
            c[27].cast("int").alias("statut"),
        )
        .select(
            F.expr("timestampadd(HOUR, tranche * 3, CAST(jour AS TIMESTAMP))").alias("debut_tranche"),
            "jour", "kp", "ap_jour", "taches_solaires_jour", "flux_f107_obs", "statut",
        )
    )
