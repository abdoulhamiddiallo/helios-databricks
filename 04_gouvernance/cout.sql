-- HÉLIOS · coût réel par jour et par produit (tables système, prix catalogue en dollars)
SELECT
  u.usage_date                                         AS jour,
  u.billing_origin_product                             AS produit,
  ROUND(SUM(u.usage_quantity), 3)                      AS dbu,
  ROUND(SUM(u.usage_quantity * p.pricing.default), 2)  AS cout_prix_catalogue_usd
FROM system.billing.usage u
JOIN system.billing.list_prices p
  ON u.sku_name = p.sku_name
 AND u.usage_start_time >= p.price_start_time
 AND (p.price_end_time IS NULL OR u.usage_start_time < p.price_end_time)
WHERE u.usage_date >= CURRENT_DATE() - 30
GROUP BY u.usage_date, u.billing_origin_product
ORDER BY jour DESC, produit;
