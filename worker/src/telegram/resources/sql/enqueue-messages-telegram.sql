CREATE OR REPLACE FUNCTION enqueue_messages_telegram(job_id int)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  selected_campaign_id int;
BEGIN
  UPDATE job_queue
  SET status = 'SENDING', updated_at = clock_timestamp()
  WHERE id = job_id
    AND status = 'ENQUEUED'
	RETURNING campaign_id INTO selected_campaign_id;

  WITH messages AS (
    -- start with this campaign's messages joined with telegram ids
    SELECT telegram_messages.*, telegram_subscribers.telegram_id
    FROM telegram_messages
      LEFT JOIN telegram_subscribers ON telegram_messages.recipient = telegram_subscribers.phone_number
    WHERE telegram_messages.campaign_id = selected_campaign_id
  ),

  no_telegram_id AS (
    --- set error code 1 for messages with no telegram id mapping
    UPDATE telegram_messages
    SET error_code = 1, updated_at = clock_timestamp()
    FROM messages
    WHERE messages.telegram_id IS NULL -- telegram id is null
      AND messages.id = telegram_messages.id
    RETURNING messages.id
  ),

  no_subscription AS (
    -- set error code 2 for messages with no subscription
    UPDATE telegram_messages
    SET error_code = 2, updated_at = clock_timestamp()
    FROM messages
      -- map messages to campaigns
      JOIN campaigns ON messages.campaign_id = campaigns.id
      -- join with subscriptions where bot id and telegram id are matching
      LEFT JOIN bot_subscribers ON campaigns.cred_name = bot_subscribers.bot_id AND messages.telegram_id = bot_subscribers.telegram_id
    WHERE bot_subscribers.bot_id IS NULL -- bot id is null, i.e. subscription not found
      AND messages.telegram_id IS NOT NULL
      AND messages.id = telegram_messages.id
    RETURNING messages.id
  ),

  valid_messages AS (
    -- dequeue messages that have both a subscription and telegram id
    UPDATE telegram_messages
    SET dequeued_at = clock_timestamp(), updated_at = clock_timestamp()
    FROM messages
    WHERE messages.id NOT IN (
      SELECT * FROM no_telegram_id
      UNION ALL
      SELECT * FROM no_subscription
    )
    RETURNING messages.*
  )

  -- insert valid messages into telegram_ops
  INSERT INTO telegram_ops
  (id, campaign_id, recipient, params, created_at, updated_at)
  -- switch recipient with telegram_id
  SELECT id, campaign_id, telegram_id, params, created_at, updated_at
  FROM valid_messages;
END $$;
