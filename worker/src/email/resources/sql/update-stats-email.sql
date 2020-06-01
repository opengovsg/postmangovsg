CREATE OR REPLACE FUNCTION update_stats_email(selected_campaign_id int) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN

-- Archive number of unsent, errored and sent email messages in statistics table
WITH stats AS (
  SELECT
    COUNT(*) FILTER (WHERE delivered_at IS NULL) AS unsent,
    COUNT(*) FILTER (WHERE error_code IS NOT NULL AND message_id IS NULL) AS errored,
    COUNT(*) FILTER (WHERE message_id IS NOT NULL) AS sent
  FROM email_messages
  WHERE campaign_id = selected_campaign_id
)
INSERT INTO statistics (campaign_id, unsent, errored, sent, updated_at, created_at)
SELECT selected_campaign_id, unsent, errored, sent, now(), now() FROM stats
ON CONFLICT (campaign_id) DO UPDATE
SET
  unsent = excluded.unsent,
  errored = excluded.errored,
  sent = excluded.sent,
  updated_at = excluded.updated_at;

END $$
