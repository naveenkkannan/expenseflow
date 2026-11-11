CREATE OR REPLACE FUNCTION list_spend_tags(p_user_id UUID)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'color', color, 'sortOrder', sort_order
  ) ORDER BY sort_order, name), '[]'::jsonb)
  FROM spend_tags
  WHERE user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION create_spend_tag(p_user_id UUID, p_name TEXT, p_color TEXT)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_sort_order INTEGER;
  v_id UUID;
BEGIN
  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order
  FROM spend_tags WHERE user_id = p_user_id;

  INSERT INTO spend_tags (user_id, name, color, sort_order)
  VALUES (p_user_id, p_name, p_color, v_sort_order)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'name', p_name, 'color', p_color, 'sortOrder', v_sort_order);
END;
$$;

CREATE OR REPLACE FUNCTION update_spend_tag(p_user_id UUID, p_tag_id UUID, p_name TEXT, p_color TEXT)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_name TEXT;
  v_color TEXT;
  v_sort_order INTEGER;
BEGIN
  UPDATE spend_tags
  SET name = COALESCE(p_name, name), color = COALESCE(p_color, color)
  WHERE id = p_tag_id AND user_id = p_user_id
  RETURNING name, color, sort_order INTO v_name, v_color, v_sort_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tag_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('id', p_tag_id, 'name', v_name, 'color', v_color, 'sortOrder', v_sort_order);
END;
$$;

-- Deleting a tag leaves its spends untagged via spends.tag_id's ON DELETE SET NULL.
CREATE OR REPLACE FUNCTION delete_spend_tag(p_user_id UUID, p_tag_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM spend_tags WHERE id = p_tag_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tag_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION add_spend(
  p_user_id UUID,
  p_spent_on DATE,
  p_amount NUMERIC,
  p_tag_id UUID,
  p_payment_method TEXT,
  p_note TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO spends (user_id, spent_on, amount, tag_id, payment_method, note)
  VALUES (p_user_id, p_spent_on, p_amount, p_tag_id, p_payment_method, p_note)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION update_spend(
  p_user_id UUID,
  p_spend_id UUID,
  p_spent_on DATE,
  p_amount NUMERIC,
  p_tag_id UUID,
  p_clear_tag BOOLEAN,
  p_payment_method TEXT,
  p_note TEXT,
  p_clear_note BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE spends
  SET
    spent_on = COALESCE(p_spent_on, spent_on),
    amount = COALESCE(p_amount, amount),
    tag_id = CASE WHEN p_clear_tag THEN NULL WHEN p_tag_id IS NOT NULL THEN p_tag_id ELSE tag_id END,
    payment_method = COALESCE(p_payment_method, payment_method),
    note = CASE WHEN p_clear_note THEN NULL WHEN p_note IS NOT NULL THEN p_note ELSE note END
  WHERE id = p_spend_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'spend_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION delete_spend(p_user_id UUID, p_spend_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM spends WHERE id = p_spend_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'spend_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- Daily spending for a month: totals, the tag breakdown, day-grouped
-- entries (optionally filtered to one tag), and a full-month calendar
-- (also tag-filtered) so the heatmap matches whatever filter is active.
CREATE OR REPLACE FUNCTION get_daily_month(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER,
  p_tag_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_month_start DATE := make_date(p_year, p_month, 1);
  v_month_end DATE := (v_month_start + INTERVAL '1 month - 1 day')::date;
  v_current_month DATE := current_month_ist();
  v_today DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_total NUMERIC;
  v_days_logged INTEGER;
  v_days_elapsed INTEGER;
  v_avg NUMERIC;
  v_by_tag jsonb;
  v_days jsonb;
  v_calendar jsonb;
  v_last_method TEXT;
BEGIN
  SELECT COALESCE(SUM(amount), 0), COUNT(DISTINCT spent_on)
  INTO v_total, v_days_logged
  FROM spends
  WHERE user_id = p_user_id AND spent_on BETWEEN v_month_start AND v_month_end;

  v_days_elapsed := CASE
    WHEN v_month_start = v_current_month THEN (v_today - v_month_start) + 1
    ELSE (v_month_end - v_month_start) + 1
  END;

  v_avg := CASE WHEN v_days_elapsed > 0 THEN round(v_total / v_days_elapsed, 2) ELSE 0 END;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'tagId', tag_id,
      'name', tag_name,
      'color', tag_color,
      'amount', amount
    ) ORDER BY amount DESC), '[]'::jsonb)
  INTO v_by_tag
  FROM (
    SELECT s.tag_id, COALESCE(t.name, 'Untagged') AS tag_name,
           COALESCE(t.color, '#9ca3af') AS tag_color,
           SUM(s.amount) AS amount
    FROM spends s
    LEFT JOIN spend_tags t ON t.id = s.tag_id
    WHERE s.user_id = p_user_id AND s.spent_on BETWEEN v_month_start AND v_month_end
    GROUP BY s.tag_id, t.name, t.color
  ) tag_totals;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'date', day_rows.day,
      'total', day_rows.day_total,
      'entries', day_rows.entries
    ) ORDER BY day_rows.day DESC), '[]'::jsonb)
  INTO v_days
  FROM (
    SELECT s.spent_on AS day, SUM(s.amount) AS day_total,
      jsonb_agg(jsonb_build_object(
        'id', s.id,
        'amount', s.amount,
        'note', s.note,
        'tagId', s.tag_id,
        'tagName', COALESCE(t.name, 'Untagged'),
        'tagColor', COALESCE(t.color, '#9ca3af'),
        'paymentMethod', s.payment_method
      ) ORDER BY s.created_at DESC) AS entries
    FROM spends s
    LEFT JOIN spend_tags t ON t.id = s.tag_id
    WHERE s.user_id = p_user_id
      AND s.spent_on BETWEEN v_month_start AND v_month_end
      AND (p_tag_id IS NULL OR s.tag_id = p_tag_id)
    GROUP BY s.spent_on
  ) day_rows;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'date', cal.day,
      'total', COALESCE(c.day_total, 0)
    ) ORDER BY cal.day), '[]'::jsonb)
  INTO v_calendar
  FROM generate_series(v_month_start, v_month_end, '1 day'::interval) AS cal(day)
  LEFT JOIN (
    SELECT spent_on, SUM(amount) AS day_total
    FROM spends
    WHERE user_id = p_user_id
      AND spent_on BETWEEN v_month_start AND v_month_end
      AND (p_tag_id IS NULL OR tag_id = p_tag_id)
    GROUP BY spent_on
  ) c ON c.spent_on = cal.day::date;

  SELECT payment_method INTO v_last_method
  FROM spends
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'total', v_total,
    'daysLogged', v_days_logged,
    'avgPerDay', v_avg,
    'byTag', v_by_tag,
    'days', v_days,
    'calendar', v_calendar,
    'lastPaymentMethod', v_last_method
  );
END;
$$;

-- The most frequent (label, amount, tag, method) combos from the last
-- 90 days, for the "Often" quick-add chips.
CREATE OR REPLACE FUNCTION get_spend_suggestions(p_user_id UUID, p_limit INTEGER DEFAULT 6)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'label', label,
    'amount', amount,
    'tagId', tag_id,
    'tagName', tag_name,
    'tagColor', tag_color,
    'paymentMethod', payment_method
  ) ORDER BY uses DESC), '[]'::jsonb)
  FROM (
    SELECT
      COALESCE(s.note, t.name, 'Spend') AS label,
      s.amount,
      s.tag_id,
      t.name AS tag_name,
      t.color AS tag_color,
      s.payment_method,
      COUNT(*) AS uses
    FROM spends s
    LEFT JOIN spend_tags t ON t.id = s.tag_id
    WHERE s.user_id = p_user_id
      AND s.spent_on >= ((now() AT TIME ZONE 'Asia/Kolkata')::date - 90)
    GROUP BY COALESCE(s.note, t.name, 'Spend'), s.amount, s.tag_id, t.name, t.color, s.payment_method
    ORDER BY uses DESC
    LIMIT p_limit
  ) grouped;
$$;
