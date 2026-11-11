-- Adds a daily-spending series per month, daily-spending summary fields
-- (dailyThisMonth, dailyAvg, outThisMonth), and merges payments + spends
-- into one "kind"-tagged recent list, without removing any existing field.
CREATE OR REPLACE FUNCTION get_dashboard(p_user_id UUID, p_year INTEGER, p_month INTEGER)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_year_start DATE := make_date(p_year, 1, 1);
  v_year_end DATE := make_date(p_year, 12, 31);
  v_target_month DATE := make_date(p_year, p_month, 1);
  v_target_month_end DATE := (v_target_month + INTERVAL '1 month - 1 day')::date;
  v_current_month DATE := current_month_ist();
  v_today DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_days_elapsed INTEGER;
  v_monthly jsonb;
  v_this_month jsonb;
  v_recent jsonb;
  v_summary jsonb;
  v_daily_this_month NUMERIC;
  v_daily_avg NUMERIC;
BEGIN
  DROP TABLE IF EXISTS _relevant_expenses;
  DROP TABLE IF EXISTS _month_expense;
  DROP TABLE IF EXISTS _daily_by_month;

  CREATE TEMP TABLE _relevant_expenses ON COMMIT DROP AS
  SELECT e.id, e.name, e.color, e.group_id, g.name AS group_name,
         e.active_from, e.active_to
  FROM expenses e
  LEFT JOIN expense_groups g ON g.id = e.group_id
  WHERE e.user_id = p_user_id
    AND e.active_from <= v_year_end
    AND (e.active_to IS NULL OR e.active_to >= v_year_start);

  CREATE TEMP TABLE _month_expense ON COMMIT DROP AS
  SELECT re.id AS expense_id, re.name, re.color, re.group_name,
         re.active_from, re.active_to,
         m.month,
         CASE WHEN expense_is_active(re.active_from, re.active_to, m.month)
              THEN COALESCE(expense_amount_at(re.id, m.month), 0)
              ELSE 0 END AS planned,
         COALESCE(pa.paid, 0) AS paid
  FROM _relevant_expenses re
  CROSS JOIN (
    SELECT make_date(p_year, gs, 1) AS month
    FROM generate_series(1, 12) AS gs
  ) m
  LEFT JOIN (
    SELECT expense_id, date_trunc('month', paid_on)::date AS month, SUM(amount) AS paid
    FROM payments
    WHERE user_id = p_user_id AND EXTRACT(YEAR FROM paid_on) = p_year
    GROUP BY expense_id, date_trunc('month', paid_on)
  ) pa ON pa.expense_id = re.id AND pa.month = m.month;

  CREATE TEMP TABLE _daily_by_month ON COMMIT DROP AS
  SELECT date_trunc('month', spent_on)::date AS month, SUM(amount) AS daily
  FROM spends
  WHERE user_id = p_user_id AND EXTRACT(YEAR FROM spent_on) = p_year
  GROUP BY date_trunc('month', spent_on);

  SELECT COALESCE(jsonb_agg(month_obj ORDER BY month), '[]'::jsonb)
  INTO v_monthly
  FROM (
    SELECT me.month,
      jsonb_build_object(
        'month', me.month,
        'planned', SUM(me.planned),
        'daily', COALESCE(MAX(db.daily), 0),
        'byExpense', jsonb_agg(jsonb_build_object(
          'expenseId', me.expense_id, 'name', me.name, 'color', me.color, 'paid', me.paid
        ) ORDER BY me.name)
      ) AS month_obj
    FROM _month_expense me
    LEFT JOIN _daily_by_month db ON db.month = me.month
    GROUP BY me.month
  ) agg;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'expenseId', expense_id,
      'name', name,
      'color', color,
      'groupName', group_name,
      'planned', planned,
      'paid', paid,
      'status', expense_status(active_from, active_to, month, v_current_month, planned, paid),
      'sharePct', CASE WHEN total_planned > 0 THEN round(planned / total_planned * 100, 1) ELSE 0 END
    ) ORDER BY planned DESC, name), '[]'::jsonb)
  INTO v_this_month
  FROM (
    SELECT *, SUM(planned) OVER () AS total_planned
    FROM _month_expense
    WHERE month = v_target_month
      AND expense_is_active(active_from, active_to, month)
  ) tm;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id,
      'kind', kind,
      'date', date,
      'name', name,
      'color', color,
      'amount', amount,
      'note', note,
      'expenseId', expense_id,
      'tagId', tag_id,
      'paymentMethod', payment_method
    ) ORDER BY date DESC, created_at DESC), '[]'::jsonb)
  INTO v_recent
  FROM (
    SELECT p.id, 'payment' AS kind, p.paid_on AS date, e.name AS name, e.color AS color,
           p.amount, p.note, p.expense_id AS expense_id, NULL::uuid AS tag_id,
           NULL::text AS payment_method, p.created_at
    FROM payments p
    JOIN expenses e ON e.id = p.expense_id
    WHERE p.user_id = p_user_id
    UNION ALL
    SELECT s.id, 'spend' AS kind, s.spent_on AS date, COALESCE(s.note, t.name, 'Spend') AS name,
           COALESCE(t.color, '#9ca3af') AS color, s.amount, s.note, NULL::uuid AS expense_id, s.tag_id,
           s.payment_method, s.created_at
    FROM spends s
    LEFT JOIN spend_tags t ON t.id = s.tag_id
    WHERE s.user_id = p_user_id
    ORDER BY date DESC, created_at DESC
    LIMIT 5
  ) recent_rows;

  v_daily_this_month := COALESCE((SELECT daily FROM _daily_by_month WHERE month = v_target_month), 0);

  v_days_elapsed := CASE
    WHEN v_target_month = v_current_month THEN (v_today - v_target_month) + 1
    ELSE (v_target_month_end - v_target_month) + 1
  END;

  v_daily_avg := CASE WHEN v_days_elapsed > 0 THEN round(v_daily_this_month / v_days_elapsed, 2) ELSE 0 END;

  SELECT jsonb_build_object(
    'paidThisMonth', COALESCE((SELECT SUM(paid) FROM _month_expense WHERE month = v_target_month), 0),
    'stillToPay', COALESCE((
      SELECT SUM(GREATEST(planned - paid, 0))
      FROM _month_expense
      WHERE month = v_target_month
        AND expense_status(active_from, active_to, month, v_current_month, planned, paid) IN ('missed', 'to_pay', 'partial')
    ), 0),
    'expensesLeft', COALESCE((
      SELECT COUNT(*)
      FROM _month_expense
      WHERE month = v_target_month
        AND expense_status(active_from, active_to, month, v_current_month, planned, paid) IN ('missed', 'to_pay', 'partial')
    ), 0),
    'paidThisYear', COALESCE((SELECT SUM(paid) FROM _month_expense), 0),
    'plannedPerMonth', COALESCE((SELECT SUM(planned) FROM _month_expense WHERE month = v_target_month), 0),
    'plannedForYear', COALESCE((SELECT SUM(planned) FROM _month_expense), 0),
    'expenseCount', (SELECT COUNT(*) FROM _month_expense WHERE month = v_target_month AND expense_is_active(active_from, active_to, month)),
    'dailyThisMonth', v_daily_this_month,
    'dailyAvg', v_daily_avg,
    'outThisMonth', COALESCE((SELECT SUM(paid) FROM _month_expense WHERE month = v_target_month), 0) + v_daily_this_month
  ) INTO v_summary;

  RETURN jsonb_build_object(
    'summary', v_summary,
    'monthly', v_monthly,
    'thisMonth', v_this_month,
    'recent', v_recent
  );
END;
$$;
