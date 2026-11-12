-- The seed name list in 004 assumed expense names that don't match the
-- real data (no "Food"/"Groceries"/"Travel"/"Donation"/"Shopping", and
-- it's "Mutual Funds" not "Mutual Fund"). This corrects the real rows.
UPDATE expenses SET type = 'investment' WHERE name IN ('Digi Gold', 'Mutual Funds');
UPDATE expenses SET type = 'want' WHERE name IN ('Philanthrophy', 'Monitor EMI', 'Scaler credit purchase EMI');
