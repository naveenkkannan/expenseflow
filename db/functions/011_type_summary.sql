-- Needs/wants/investments breakdown for a period: the whole year to
-- date when p_month is null, or one month otherwise. Amounts are
-- actuals (payments received, spends made), the same figures that make
-- up Total out elsewhere, so the three type totals always add up to it.
-- A spend's type always follows its tag's current type (untagged
-- spends count as 'need'); nothing is stored on the spend itself.
CREATE OR REPLACE FUNCTION fn_type_summary(p_user UUID, p_year INTEGER, p_month INTEGER DEFAULT NULL)
RETURNS TABLE (
  type TEXT,
  item_kind TEXT,
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
  WITH fixed_amounts AS (
    SELECT e.id, e.name, e.type, COALESCE(SUM(p.amount), 0) AS amount
    FROM expenses e
    LEFT JOIN payments p ON p.expense_id = e.id
      AND p.paid_on BETWEEN v_period_start AND v_period_end
    WHERE e.user_id = p_user
    GROUP BY e.id, e.name, e.type
  ),
  daily_amounts AS (
    SELECT s.tag_id, COALESCE(t.name, 'Untagged') AS name, COALESCE(t.type, 'need') AS type,
           SUM(s.amount) AS amount
    FROM spends s
    LEFT JOIN spend_tags t ON t.id = s.tag_id
    WHERE s.user_id = p_user AND s.spent_on BETWEEN v_period_start AND v_period_end
    GROUP BY s.tag_id, t.name, t.type
  )
  SELECT fixed_amounts.type, 'fixed'::text, fixed_amounts.id, fixed_amounts.name, fixed_amounts.amount
  FROM fixed_amounts
  WHERE fixed_amounts.amount > 0
  UNION ALL
  SELECT daily_amounts.type, 'daily'::text, daily_amounts.tag_id, daily_amounts.name, daily_amounts.amount
  FROM daily_amounts
  WHERE daily_amounts.amount > 0;
END;
$$;
