CREATE OR REPLACE FUNCTION get_messages_to_send_telegram(job_id int, lim int)
RETURNS TABLE (result json)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  -- select and lock messages based on limit
  WITH selected_ids AS (
    SELECT id
    FROM telegram_ops
    WHERE campaign_id = (
      SELECT job_queue.campaign_id
      FROM job_queue
      WHERE job_queue.id = job_id
        AND job_queue.status = 'SENDING'
    )
      AND sent_at IS NULL
    LIMIT lim
    FOR UPDATE
    SKIP LOCKED
  ),

  -- set status and sent_at for selected messages
  messages AS (
    UPDATE telegram_ops
    SET status = 'SENDING', sent_at = clock_timestamp(), updated_at = clock_timestamp()
    WHERE id IN (
      SELECT *
      FROM selected_ids
    )
    RETURNING id, recipient, params, campaign_id
  )

  -- build response with template
  SELECT json_build_object(
    'id', m.id, 'recipient', m.recipient, 'params', m.params, 'body', t.body, 'campaignId', m.campaign_id
  )
  FROM messages m, telegram_templates t
  WHERE m.campaign_id = t.campaign_id;
  
END $$;
