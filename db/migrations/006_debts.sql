CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('owed_to_me', 'i_owe')),
  principal NUMERIC(12, 2) NOT NULL CHECK (principal > 0),
  due_date DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE debt_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  paid_on DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_debts_user ON debts(user_id);
CREATE INDEX idx_debt_repayments_debt ON debt_repayments(debt_id, paid_on);
