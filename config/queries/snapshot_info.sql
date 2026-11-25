-- Freshness + window shown in the header.
-- @param table_name STRING = whats_new_share.whats_new.whats_new_last_month
SELECT
  CAST(max(refreshed_at) AS STRING) AS refreshed_at,
  CAST(min(window_start) AS STRING) AS window_start,
  count(*)                          AS total_features,
  count_if(release_stage = 'GA')    AS ga,
  count_if(release_stage IN ('Beta', 'Public Preview')) AS preview_beta
FROM IDENTIFIER(:table_name)
