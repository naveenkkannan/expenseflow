-- Long-format rows for the year ledger: one row per expense per month it
-- was active, and one row per tag per month it has spends. Only months
-- that apply are returned; the API fills the rest with null ("–").
CREATE OR REPLACE FUNCTION fn_year_summary(p_user UUID, p_year INTEGER)
RETURNS TABLE (
  kind TEXT,
  item_id UUID,
  item_name TEXT,
  group_name TEXT,
  month INTEGER,
  planned NUMERIC,
  paid NUMERIC,
  spend_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT gs AS month_num, make_date(p_year, gs, 1) AS month_date
    FROM generate_series(1, 12) AS gs
  ),
  fixed_rows AS (
    SELECT
      'fixed'::text AS kind,
      e.id AS item_id,
      e.name AS item_name,
      g.name AS group_name,
      m.month_num AS month,
      expense_amount_at(e.id, m.month_date) AS planned,
      COALESCE(pa.paid, 0) AS paid,
      NULL::integer AS spend_count
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
      AND expense_is_active(e.active_from, e.active_to, m.month_date)
  ),
  daily_rows AS (
    SELECT
      'daily'::text AS kind,
      s.tag_id AS item_id,
      COALESCE(t.name, 'Untagged') AS item_name,
      NULL::text AS group_name,
      EXTRACT(MONTH FROM s.spent_on)::integer AS month,
      NULL::numeric AS planned,
      SUM(s.amount) AS paid,
      COUNT(*)::integer AS spend_count
    FROM spends s
    LEFT JOIN spend_tags t ON t.id = s.tag_id
    WHERE s.user_id = p_user AND EXTRACT(YEAR FROM s.spent_on) = p_year
    GROUP BY s.tag_id, t.name, EXTRACT(MONTH FROM s.spent_on)
  )
  SELECT * FROM fixed_rows
  UNION ALL
  SELECT * FROM daily_rows;
END;
$$;

-- One month's fixed-expense and daily-spending statement, plus totals
-- (including the previous month's total out, for the vs-last-month line).
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
  v_daily jsonb;
  v_fixed_planned NUMERIC;
  v_fixed_paid NUMERIC;
  v_daily_total NUMERIC;
  v_daily_count INTEGER;
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
      'status', expense_status(active_from, active_to, v_month_start, v_current_month, planned, paid)
    ) ORDER BY name), '[]'::jsonb),
    COALESCE(SUM(planned), 0),
    COALESCE(SUM(paid), 0)
  INTO v_fixed, v_fixed_planned, v_fixed_paid
  FROM (
    SELECT e.id, e.name, g.name AS group_name, e.active_from, e.active_to,
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

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'tagId', tag_id,
      'tagName', tag_name,
      'spendCount', spend_count,
      'amount', amount
    ) ORDER BY amount DESC), '[]'::jsonb)
  INTO v_daily
  FROM (
    SELECT s.tag_id, COALESCE(t.name, 'Untagged') AS tag_name, COUNT(*) AS spend_count, SUM(s.amount) AS amount
    FROM spends s
    LEFT JOIN spend_tags t ON t.id = s.tag_id
    WHERE s.user_id = p_user AND s.spent_on BETWEEN v_month_start AND v_month_end
    GROUP BY s.tag_id, t.name
  ) dt;

  -- Computed directly from spends (not by summing the tag rows above) so a
  -- spend is never double counted if the schema ever lets it carry more
  -- than one tag.
  SELECT COALESCE(SUM(amount), 0), COUNT(*)
  INTO v_daily_total, v_daily_count
  FROM spends
  WHERE user_id = p_user AND spent_on BETWEEN v_month_start AND v_month_end;

  IF p_month = 1 THEN
    v_prev_total := NULL;
  ELSE
    SELECT
      COALESCE((
        SELECT SUM(amount) FROM payments
        WHERE user_id = p_user AND date_trunc('month', paid_on)::date = make_date(p_year, p_month - 1, 1)
      ), 0)
      + COALESCE((
        SELECT SUM(amount) FROM spends
        WHERE user_id = p_user
          AND spent_on BETWEEN make_date(p_year, p_month - 1, 1)
            AND (make_date(p_year, p_month - 1, 1) + INTERVAL '1 month - 1 day')::date
      ), 0)
    INTO v_prev_total;
  END IF;

  RETURN jsonb_build_object(
    'fixed', v_fixed,
    'daily', v_daily,
    'totals', jsonb_build_object(
      'fixedPlanned', v_fixed_planned,
      'fixedPaid', v_fixed_paid,
      'dailyTotal', v_daily_total,
      'dailySpendCount', v_daily_count,
      'totalOut', v_fixed_paid + v_daily_total,
      'prevMonthTotalOut', v_prev_total,
      'daysElapsed', v_days_elapsed
    )
  );
END;
$$;
