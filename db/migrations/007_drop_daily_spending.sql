-- Removes the daily-spending feature (spends/spend_tags) entirely.
-- Table drops also remove their indexes; the functions that only ever
-- served daily spending are dropped explicitly since they aren't
-- re-created by any function file anymore.
DROP FUNCTION IF EXISTS get_daily_month(UUID, INTEGER, INTEGER, UUID);
DROP FUNCTION IF EXISTS get_spend_suggestions(UUID, INTEGER);
DROP FUNCTION IF EXISTS add_spend(UUID, DATE, NUMERIC, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_spend(UUID, UUID, DATE, NUMERIC, UUID, BOOLEAN, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS delete_spend(UUID, UUID);
DROP FUNCTION IF EXISTS list_spend_tags(UUID);
DROP FUNCTION IF EXISTS create_spend_tag(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_spend_tag(UUID, UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS delete_spend_tag(UUID, UUID);

DROP TABLE IF EXISTS spends;
DROP TABLE IF EXISTS spend_tags;
