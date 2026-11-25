-- Category dropdown: one row per category with counts by stage.
-- @param table_name STRING = whats_new_share.whats_new.whats_new_last_month
SELECT
  category,
  count(*)                                              AS features,
  count_if(release_stage = 'GA')                        AS ga,
  count_if(release_stage IN ('Beta', 'Public Preview')) AS preview_beta,
  count_if(release_stage = 'Enhancement')               AS enhancements
FROM IDENTIFIER(:table_name)
GROUP BY category
ORDER BY features DESC, category
