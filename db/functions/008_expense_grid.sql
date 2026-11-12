-- Adds plannedYear/paidYear (the year's planned vs. paid totals for an
-- expense, using only the months it was active) and monthsLeft (how
-- many months remain, counting the current month, before active_to) so
-- the Expenses page can show corrected totals instead of monthly x 12.
CREATE OR REPLACE FUNCTION get_expense_grid(p_user_id UUID, p_year INTEGER)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_year_start DATE := make_date(p_year, 1, 1);
  v_year_end DATE := make_date(p_year, 12, 31);
  v_current_month DATE := current_month_ist();
  v_groups jsonb;
  v_expenses jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'sortOrder', sort_order
    ) ORDER BY sort_order, name), '[]'::jsonb)
  INTO v_groups
  FROM expense_groups
  WHERE user_id = p_user_id;

  DROP TABLE IF EXISTS _grid_expenses;
  DROP TABLE IF EXISTS _grid_months;

  CREATE TEMP TABLE _grid_expenses ON COMMIT DROP AS
  SELECT e.id, e.name, e.color, e.type, e.group_id, g.name AS group_name,
         e.active_from, e.active_to,
         expense_amount_at(e.id, GREATEST(v_current_month, e.active_from)) AS current_amount,
         COALESCE((SELECT SUM(amount) FROM payments WHERE expense_id = e.id), 0) AS paid_so_far,
         (e.active_to IS NOT NULL AND e.active_to < v_current_month) AS ended,
         CASE
           WHEN e.active_to IS NOT NULL AND e.active_to >= v_current_month THEN
             (EXTRACT(YEAR FROM e.active_to)::int * 12 + EXTRACT(MONTH FROM e.active_to)::int)
             - (EXTRACT(YEAR FROM v_current_month)::int * 12 + EXTRACT(MONTH FROM v_current_month)::int)
             + 1
           ELSE NULL
         END AS months_left
  FROM expenses e
  LEFT JOIN expense_groups g ON g.id = e.group_id
  WHERE e.user_id = p_user_id;

  CREATE TEMP TABLE _grid_months ON COMMIT DROP AS
  SELECT ge.id AS expense_id, m.month,
    CASE WHEN expense_is_active(ge.active_from, ge.active_to, m.month)
         THEN COALESCE(expense_amount_at(ge.id, m.month), 0)
         ELSE 0 END AS planned,
    COALESCE(pa.paid, 0) AS paid
  FROM _grid_expenses ge
  CROSS JOIN (
    SELECT make_date(p_year, gs, 1) AS month FROM generate_series(1, 12) AS gs
  ) m
  LEFT JOIN (
    SELECT expense_id, date_trunc('month', paid_on)::date AS month, SUM(amount) AS paid
    FROM payments
    WHERE user_id = p_user_id AND EXTRACT(YEAR FROM paid_on) = p_year
    GROUP BY expense_id, date_trunc('month', paid_on)
  ) pa ON pa.expense_id = ge.id AND pa.month = m.month;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', ge.id,
      'name', ge.name,
      'color', ge.color,
      'type', ge.type,
      'groupId', ge.group_id,
      'groupName', ge.group_name,
      'currentAmount', ge.current_amount,
      'activeFrom', ge.active_from,
      'activeTo', ge.active_to,
      'paidSoFar', ge.paid_so_far,
      'ended', ge.ended,
      'monthsLeft', ge.months_left,
      'plannedYear', (SELECT COALESCE(SUM(gm.planned), 0) FROM _grid_months gm WHERE gm.expense_id = ge.id),
      'paidYear', (SELECT COALESCE(SUM(gm.paid), 0) FROM _grid_months gm WHERE gm.expense_id = ge.id),
      'months', (
        SELECT jsonb_agg(jsonb_build_object(
          'month', gm.month,
          'planned', gm.planned,
          'paid', gm.paid,
          'status', expense_status(ge.active_from, ge.active_to, gm.month, v_current_month, gm.planned, gm.paid)
        ) ORDER BY gm.month)
        FROM _grid_months gm
        WHERE gm.expense_id = ge.id
      )
    ) ORDER BY ge.group_name NULLS LAST, ge.name), '[]'::jsonb)
  INTO v_expenses
  FROM _grid_expenses ge;

  RETURN jsonb_build_object('groups', v_groups, 'expenses', v_expenses);
END;
$$;
