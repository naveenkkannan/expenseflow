-- Current month (first day) in Asia/Kolkata.
CREATE OR REPLACE FUNCTION current_month_ist()
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
  SELECT date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata')::date;
$$;

-- The planned amount for an expense in a given month: the amount row with
-- the greatest effective_from <= month. NULL if no amount applies yet.
CREATE OR REPLACE FUNCTION expense_amount_at(p_expense_id UUID, p_month DATE)
RETURNS NUMERIC(12, 2)
LANGUAGE sql
STABLE
AS $$
  SELECT amount
  FROM expense_amounts
  WHERE expense_id = p_expense_id
    AND effective_from <= p_month
  ORDER BY effective_from DESC
  LIMIT 1;
$$;

-- Whether an expense is active during a given month.
CREATE OR REPLACE FUNCTION expense_is_active(
  p_active_from DATE,
  p_active_to DATE,
  p_month DATE
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_active_from <= p_month AND (p_active_to IS NULL OR p_month <= p_active_to);
$$;

-- Status for an expense in a given month.
CREATE OR REPLACE FUNCTION expense_status(
  p_active_from DATE,
  p_active_to DATE,
  p_month DATE,
  p_current_month DATE,
  p_planned NUMERIC,
  p_paid NUMERIC
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN NOT expense_is_active(p_active_from, p_active_to, p_month) THEN 'not_active'
    WHEN p_month > p_current_month THEN 'upcoming'
    WHEN p_paid >= p_planned AND p_planned > 0 THEN 'paid'
    WHEN p_paid > 0 AND p_paid < p_planned THEN 'partial'
    WHEN p_month < p_current_month AND p_paid = 0 THEN 'missed'
    WHEN p_month = p_current_month AND p_paid = 0 THEN 'to_pay'
    WHEN p_paid >= p_planned THEN 'paid'
    ELSE 'to_pay'
  END;
$$;
