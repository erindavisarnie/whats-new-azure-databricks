-- Feature list + detail for one category ('' = all categories). Small result (≈150 rows max), so the
-- detail pane reads from this result instead of issuing a second query per click.
-- @param table_name STRING = whats_new_share.whats_new.whats_new_last_month
-- @param category STRING
SELECT
  entry_id,
  feature_name,
  category,
  release_stage,
  CAST(release_date AS STRING) AS release_date,
  summary,
  why_it_matters,
  release_note,
  primary_doc_url,
  to_json(doc_links) AS doc_links_json,
  release_note_url
FROM IDENTIFIER(:table_name)
WHERE :category = '' OR category = :category
ORDER BY release_date DESC, feature_name
