CREATE OR REPLACE FUNCTION log_job_telegram(selected_campaign_id int)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE telegram_messages m
  -- reset dequeued_at so that errored messages can be retried
  SET dequeued_at = NULL,
    status = o.status::text::enum_telegram_messages_status,
    error_code = o.error_code,
    message_id = o.message_id,
    sent_at = o.sent_at,
    delivered_at = o.delivered_at,
    updated_at = clock_timestamp()
  FROM telegram_ops o
  WHERE o.campaign_id = selected_campaign_id
    AND o.id = m.id;

  DELETE FROM telegram_ops o
  WHERE o.campaign_id = selected_campaign_id;

  PERFORM update_stats_telegram(selected_campaign_id);
END $$
