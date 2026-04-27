-- Create default loyalty settings for merchants without existing rule.
INSERT INTO loyalty_settings (merchant_id, reward_threshold, reward_label)
SELECT id, 10, '1 reward'
FROM merchants m
WHERE NOT EXISTS (
  SELECT 1
  FROM loyalty_settings ls
  WHERE ls.merchant_id = m.id
);
