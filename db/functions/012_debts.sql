-- Debts: personal IOUs in either direction, with partial repayments.
-- "Settled" is computed (remaining <= 0), never stored, same as how
-- expense/payment status works elsewhere.
CREATE OR REPLACE FUNCTION list_debts(p_user_id UUID)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'personName', d.person_name,
    'direction', d.direction,
    'principal', d.principal,
    'repaid', COALESCE(r.repaid, 0),
    'remaining', GREATEST(d.principal - COALESCE(r.repaid, 0), 0),
    'repaymentCount', COALESCE(r.repayment_count, 0),
    'dueDate', d.due_date,
    'note', d.note,
    'status', CASE WHEN d.principal - COALESCE(r.repaid, 0) <= 0 THEN 'settled' ELSE 'open' END
  ) ORDER BY d.person_name), '[]'::jsonb)
  FROM debts d
  LEFT JOIN (
    SELECT debt_id, SUM(amount) AS repaid, COUNT(*) AS repayment_count
    FROM debt_repayments
    GROUP BY debt_id
  ) r ON r.debt_id = d.id
  WHERE d.user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION create_debt(
  p_user_id UUID,
  p_person_name TEXT,
  p_direction TEXT,
  p_principal NUMERIC,
  p_due_date DATE,
  p_note TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO debts (user_id, person_name, direction, principal, due_date, note)
  VALUES (p_user_id, p_person_name, p_direction, p_principal, p_due_date, p_note)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION update_debt(
  p_user_id UUID,
  p_debt_id UUID,
  p_person_name TEXT,
  p_direction TEXT,
  p_principal NUMERIC,
  p_due_date DATE,
  p_clear_due_date BOOLEAN,
  p_note TEXT,
  p_clear_note BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE debts
  SET
    person_name = COALESCE(p_person_name, person_name),
    direction = COALESCE(p_direction, direction),
    principal = COALESCE(p_principal, principal),
    due_date = CASE WHEN p_clear_due_date THEN NULL WHEN p_due_date IS NOT NULL THEN p_due_date ELSE due_date END,
    note = CASE WHEN p_clear_note THEN NULL WHEN p_note IS NOT NULL THEN p_note ELSE note END
  WHERE id = p_debt_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'debt_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION delete_debt(p_user_id UUID, p_debt_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM debts WHERE id = p_debt_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'debt_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION list_debt_repayments(p_user_id UUID, p_debt_id UUID)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'debtId', r.debt_id,
    'paidOn', r.paid_on,
    'amount', r.amount,
    'note', r.note
  ) ORDER BY r.paid_on DESC, r.created_at DESC), '[]'::jsonb)
  FROM debt_repayments r
  JOIN debts d ON d.id = r.debt_id
  WHERE d.user_id = p_user_id AND r.debt_id = p_debt_id;
$$;

CREATE OR REPLACE FUNCTION add_debt_repayment(
  p_user_id UUID,
  p_debt_id UUID,
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
  IF NOT EXISTS (SELECT 1 FROM debts WHERE id = p_debt_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'debt_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO debt_repayments (debt_id, paid_on, amount, note)
  VALUES (p_debt_id, p_paid_on, p_amount, p_note)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION update_debt_repayment(
  p_user_id UUID,
  p_repayment_id UUID,
  p_paid_on DATE,
  p_amount NUMERIC,
  p_note TEXT,
  p_clear_note BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE debt_repayments r
  SET
    paid_on = COALESCE(p_paid_on, r.paid_on),
    amount = COALESCE(p_amount, r.amount),
    note = CASE WHEN p_clear_note THEN NULL WHEN p_note IS NOT NULL THEN p_note ELSE r.note END
  FROM debts d
  WHERE r.id = p_repayment_id AND d.id = r.debt_id AND d.user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'repayment_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION delete_debt_repayment(p_user_id UUID, p_repayment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM debt_repayments r
  USING debts d
  WHERE r.id = p_repayment_id AND d.id = r.debt_id AND d.user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'repayment_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
