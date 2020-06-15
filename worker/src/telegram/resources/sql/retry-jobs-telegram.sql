CREATE OR REPLACE FUNCTION retry_jobs_telegram(selected_campaign_id int)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE telegram_messages
  SET error_code = NULL,
    dequeued_at = NULL,
    sent_at = NULL,
    updated_at = clock_timestamp()
  WHERE campaign_id = selected_campaign_id
    AND message_id IS NULL;
END $$
