-- Long-format rows for the year ledger: one row per expense per month it
-- was active. (Daily spending was removed, so this no longer returns a
-- `kind`/`spend_count` or any tag rows.)
-- Dropped first: CREATE OR REPLACE can't change a TABLE function's OUT
-- parameters, which dropping kind/spend_count does.
DROP FUNCTION IF EXISTS fn_year_summary(uuid, integer);

CREATE OR REPLACE FUNCTION fn_year_summary(p_user UUID, p_year INTEGER)
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  group_name TEXT,
  month INTEGER,
  planned NUMERIC,
  paid NUMERIC,
  type TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT gs AS month_num, make_date(p_year, gs, 1) AS month_date
    FROM generate_series(1, 12) AS gs
  )
  SELECT
    e.id AS item_id,
    e.name AS item_name,
    g.name AS group_name,
    m.month_num AS month,
    expense_amount_at(e.id, m.month_date) AS planned,
    COALESCE(pa.paid, 0) AS paid,
    e.type AS type
  FROM expenses e
  LEFT JOIN expense_groups g ON g.id = e.group_id
  CROSS JOIN months m
  LEFT JOIN (
    SELECT expense_id, date_trunc('month', paid_on)::date AS month_date, SUM(amount) AS paid
    FROM payments
    WHERE user_id = p_user AND EXTRACT(YEAR FROM paid_on) = p_year
    GROUP BY expense_id, date_trunc('month', paid_on)
  ) pa ON pa.expense_id = e.id AND pa.month_date = m.month_date
  WHERE e.user_id = p_user
    AND expense_is_active(e.active_from, e.active_to, m.month_date);
END;
$$;

-- One month's fixed-expense statement, plus totals (including the
-- previous month's total out, for the vs-last-month line).
CREATE OR REPLACE FUNCTION fn_month_summary(p_user UUID, p_year INTEGER, p_month INTEGER)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_month_start DATE := make_date(p_year, p_month, 1);
  v_month_end DATE := (v_month_start + INTERVAL '1 month - 1 day')::date;
  v_current_month DATE := current_month_ist();
  v_today DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_days_elapsed INTEGER;
  v_fixed jsonb;
  v_fixed_planned NUMERIC;
  v_fixed_paid NUMERIC;
  v_prev_total NUMERIC;
BEGIN
  v_days_elapsed := CASE
    WHEN v_month_start = v_current_month THEN (v_today - v_month_start) + 1
    ELSE (v_month_end - v_month_start) + 1
  END;

  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'expenseId', id,
      'name', name,
      'groupName', group_name,
      'planned', planned,
      'paid', paid,
      'type', type,
      'status', expense_status(active_from, active_to, v_month_start, v_current_month, planned, paid)
    ) ORDER BY name), '[]'::jsonb),
    COALESCE(SUM(planned), 0),
    COALESCE(SUM(paid), 0)
  INTO v_fixed, v_fixed_planned, v_fixed_paid
  FROM (
    SELECT e.id, e.name, g.name AS group_name, e.active_from, e.active_to, e.type,
           COALESCE(expense_amount_at(e.id, v_month_start), 0) AS planned,
           COALESCE(pa.paid, 0) AS paid
    FROM expenses e
    LEFT JOIN expense_groups g ON g.id = e.group_id
    LEFT JOIN (
      SELECT expense_id, SUM(amount) AS paid
      FROM payments
      WHERE user_id = p_user AND date_trunc('month', paid_on)::date = v_month_start
      GROUP BY expense_id
    ) pa ON pa.expense_id = e.id
    WHERE e.user_id = p_user AND expense_is_active(e.active_from, e.active_to, v_month_start)
  ) fx;

  IF p_month = 1 THEN
    v_prev_total := NULL;
  ELSE
    SELECT COALESCE(SUM(amount), 0)
    INTO v_prev_total
    FROM payments
    WHERE user_id = p_user AND date_trunc('month', paid_on)::date = make_date(p_year, p_month - 1, 1);
  END IF;

  RETURN jsonb_build_object(
    'fixed', v_fixed,
    'totals', jsonb_build_object(
      'fixedPlanned', v_fixed_planned,
      'fixedPaid', v_fixed_paid,
      'totalOut', v_fixed_paid,
      'prevMonthTotalOut', v_prev_total,
      'daysElapsed', v_days_elapsed
    )
  );
END;
$$;
