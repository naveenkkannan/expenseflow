CREATE INDEX IF NOT EXISTS idx_payments_user_expense_paid_on ON payments(user_id, expense_id, paid_on);
