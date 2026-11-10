CREATE OR REPLACE FUNCTION create_payment(
  p_user_id UUID,
  p_expense_id UUID,
  p_paid_on DATE,
  p_amount NUMERIC,
  p_note TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM expenses WHERE id = p_expense_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'expense_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO payments (user_id, expense_id, paid_on, amount, note)
  VALUES (p_user_id, p_expense_id, p_paid_on, p_amount, p_note)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION update_payment(
  p_user_id UUID,
  p_payment_id UUID,
  p_paid_on DATE,
  p_amount NUMERIC,
  p_note TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE payments
  SET
    paid_on = COALESCE(p_paid_on, paid_on),
    amount = COALESCE(p_amount, amount),
    note = p_note
  WHERE id = p_payment_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION delete_payment(p_user_id UUID, p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM payments WHERE id = p_payment_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION list_payments(
  p_user_id UUID,
  p_expense_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'expenseId', expense_id,
    'paidOn', paid_on,
    'amount', amount,
    'note', note
  ) ORDER BY paid_on, id), '[]'::jsonb)
  FROM payments
  WHERE user_id = p_user_id
    AND (p_expense_id IS NULL OR expense_id = p_expense_id)
    AND (p_year IS NULL OR EXTRACT(YEAR FROM paid_on) = p_year)
    AND (p_month IS NULL OR EXTRACT(MONTH FROM paid_on) = p_month);
$$;
