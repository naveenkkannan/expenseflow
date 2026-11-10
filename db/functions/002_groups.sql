CREATE OR REPLACE FUNCTION list_groups(p_user_id UUID)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'sortOrder', sort_order
  ) ORDER BY sort_order, name), '[]'::jsonb)
  FROM expense_groups
  WHERE user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION create_group(p_user_id UUID, p_name TEXT)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_sort_order INTEGER;
  v_id UUID;
BEGIN
  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order
  FROM expense_groups WHERE user_id = p_user_id;

  INSERT INTO expense_groups (user_id, name, sort_order)
  VALUES (p_user_id, p_name, v_sort_order)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'name', p_name, 'sortOrder', v_sort_order);
END;
$$;

CREATE OR REPLACE FUNCTION update_group(p_user_id UUID, p_group_id UUID, p_name TEXT)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_name TEXT;
  v_sort_order INTEGER;
BEGIN
  UPDATE expense_groups
  SET name = p_name
  WHERE id = p_group_id AND user_id = p_user_id
  RETURNING name, sort_order INTO v_name, v_sort_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'group_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('id', p_group_id, 'name', v_name, 'sortOrder', v_sort_order);
END;
$$;

CREATE OR REPLACE FUNCTION delete_group(p_user_id UUID, p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE expenses SET group_id = NULL WHERE group_id = p_group_id AND user_id = p_user_id;

  DELETE FROM expense_groups WHERE id = p_group_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'group_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
