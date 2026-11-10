CREATE OR REPLACE FUNCTION get_dashboard(p_user_id UUID, p_year INTEGER, p_month INTEGER)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_year_start DATE := make_date(p_year, 1, 1);
  v_year_end DATE := make_date(p_year, 12, 31);
  v_target_month DATE := make_date(p_year, p_month, 1);
  v_current_month DATE := current_month_ist();
  v_monthly jsonb;
  v_this_month jsonb;
  v_recent jsonb;
  v_summary jsonb;
BEGIN
  DROP TABLE IF EXISTS _relevant_expenses;
  DROP TABLE IF EXISTS _month_expense;

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

  SELECT COALESCE(jsonb_agg(month_obj ORDER BY month), '[]'::jsonb)
  INTO v_monthly
  FROM (
    SELECT month,
      jsonb_build_object(
        'month', month,
        'planned', SUM(planned),
        'byExpense', jsonb_agg(jsonb_build_object(
          'expenseId', expense_id, 'name', name, 'color', color, 'paid', paid
        ) ORDER BY name)
      ) AS month_obj
    FROM _month_expense
    GROUP BY month
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
      'expenseId', expense_id,
      'expenseName', expense_name,
      'color', color,
      'paidOn', paid_on,
      'amount', amount,
      'note', note
    ) ORDER BY paid_on DESC, created_at DESC), '[]'::jsonb)
  INTO v_recent
  FROM (
    SELECT p.id, p.expense_id, e.name AS expense_name, e.color,
           p.paid_on, p.amount, p.note, p.created_at
    FROM payments p
    JOIN expenses e ON e.id = p.expense_id
    WHERE p.user_id = p_user_id
    ORDER BY p.paid_on DESC, p.created_at DESC
    LIMIT 5
  ) recent_rows;

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
    'expenseCount', (SELECT COUNT(*) FROM _month_expense WHERE month = v_target_month AND expense_is_active(active_from, active_to, month))
  ) INTO v_summary;

  RETURN jsonb_build_object(
    'summary', v_summary,
    'monthly', v_monthly,
    'thisMonth', v_this_month,
    'recent', v_recent
  );
END;
$$;
