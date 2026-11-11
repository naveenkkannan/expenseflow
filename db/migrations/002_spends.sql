CREATE TABLE spend_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_spend_tags_user_name ON spend_tags(user_id, LOWER(name));

CREATE TABLE spends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spent_on DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  tag_id UUID REFERENCES spend_tags(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('upi', 'card', 'cash')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_spend_tags_user ON spend_tags(user_id);
CREATE INDEX idx_spends_user_spent_on ON spends(user_id, spent_on);
CREATE INDEX idx_spends_tag ON spends(tag_id);
