-- Needs/wants/investments breakdown for a period: the whole year to
-- date when p_month is null, or one month otherwise. Amounts are the
-- same payments-received figures that make up Total out elsewhere, so
-- the type totals always add up to it.
-- Dropped first: CREATE OR REPLACE can't change a TABLE function's OUT
-- parameters, which dropping item_kind (daily spending was removed) does.
DROP FUNCTION IF EXISTS fn_type_summary(uuid, integer, integer);

CREATE OR REPLACE FUNCTION fn_type_summary(p_user UUID, p_year INTEGER, p_month INTEGER DEFAULT NULL)
RETURNS TABLE (
  type TEXT,
  item_id UUID,
  item_name TEXT,
  amount NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  IF p_month IS NULL THEN
    v_period_start := make_date(p_year, 1, 1);
    v_period_end := LEAST(make_date(p_year, 12, 31), (now() AT TIME ZONE 'Asia/Kolkata')::date);
  ELSE
    v_period_start := make_date(p_year, p_month, 1);
    v_period_end := (v_period_start + INTERVAL '1 month - 1 day')::date;
  END IF;

  RETURN QUERY
  SELECT e.type, e.id, e.name, COALESCE(SUM(p.amount), 0) AS amount
  FROM expenses e
  LEFT JOIN payments p ON p.expense_id = e.id
    AND p.paid_on BETWEEN v_period_start AND v_period_end
  WHERE e.user_id = p_user
  GROUP BY e.id, e.name, e.type
  HAVING COALESCE(SUM(p.amount), 0) > 0;
END;
$$;
