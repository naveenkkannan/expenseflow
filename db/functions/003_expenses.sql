CREATE OR REPLACE FUNCTION create_expense(
  p_user_id UUID,
  p_name TEXT,
  p_group_id UUID,
  p_color TEXT,
  p_amount NUMERIC,
  p_active_from DATE
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO expenses (user_id, group_id, name, color, active_from)
  VALUES (p_user_id, p_group_id, p_name, p_color, p_active_from)
  RETURNING id INTO v_id;

  INSERT INTO expense_amounts (expense_id, effective_from, amount)
  VALUES (v_id, p_active_from, p_amount);

  RETURN jsonb_build_object('id', v_id);
END;
$$;

-- Editing an amount applies from a chosen month; earlier months keep
-- their old amount because this inserts/replaces the row at that
-- effective_from rather than mutating history.
CREATE OR REPLACE FUNCTION set_expense_amount(
  p_user_id UUID,
  p_expense_id UUID,
  p_from_month DATE,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM expenses WHERE id = p_expense_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'expense_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO expense_amounts (expense_id, effective_from, amount)
  VALUES (p_expense_id, date_trunc('month', p_from_month)::date, p_amount)
  ON CONFLICT (expense_id, effective_from)
  DO UPDATE SET amount = EXCLUDED.amount;
END;
$$;

CREATE OR REPLACE FUNCTION update_expense(
  p_user_id UUID,
  p_expense_id UUID,
  p_name TEXT,
  p_group_id UUID,
  p_color TEXT,
  p_active_to DATE,
  p_clear_active_to BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE expenses
  SET
    name = COALESCE(p_name, name),
    group_id = CASE WHEN p_group_id IS NOT NULL THEN p_group_id ELSE group_id END,
    color = COALESCE(p_color, color),
    active_to = CASE
      WHEN p_clear_active_to THEN NULL
      WHEN p_active_to IS NOT NULL THEN p_active_to
      ELSE active_to
    END
  WHERE id = p_expense_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'expense_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- update_expense can't distinguish "ungroup" (explicit NULL) from
-- "leave as-is" via a single nullable param, so ungrouping goes through
-- this separate function instead of overloading NULL semantics.
CREATE OR REPLACE FUNCTION set_expense_group(
  p_user_id UUID,
  p_expense_id UUID,
  p_group_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE expenses SET group_id = p_group_id
  WHERE id = p_expense_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'expense_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION delete_expense(p_user_id UUID, p_expense_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM expenses WHERE id = p_expense_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'expense_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
