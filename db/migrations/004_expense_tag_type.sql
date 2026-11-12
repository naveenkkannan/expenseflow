ALTER TABLE expenses
  ADD COLUMN type TEXT NOT NULL DEFAULT 'need'
  CHECK (type IN ('need', 'want', 'investment'));

ALTER TABLE spend_tags
  ADD COLUMN type TEXT NOT NULL DEFAULT 'need'
  CHECK (type IN ('need', 'want', 'investment'));

-- One-off reclassification of the real data, to be refined further in the UI.
UPDATE expenses SET type = 'want' WHERE name IN ('Claude', 'Donation', 'Shopping');
UPDATE expenses SET type = 'investment' WHERE name = 'Mutual Fund';
UPDATE expenses SET type = 'need' WHERE name IN ('Personal Loan EMI', 'Food', 'Groceries', 'Travel');

UPDATE spend_tags SET type = 'want' WHERE name IN ('Claude', 'Donation', 'Shopping');
UPDATE spend_tags SET type = 'investment' WHERE name = 'Mutual Fund';
UPDATE spend_tags SET type = 'need' WHERE name IN ('Personal Loan EMI', 'Food', 'Groceries', 'Travel');
