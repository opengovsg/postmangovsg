CREATE OR REPLACE FUNCTION enqueue_messages_sms(jid int) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE 
    selected_campaign_id int;
BEGIN
	-- only one worker will be able to set this job's status
	UPDATE job_queue SET status = 'SENDING', updated_at = clock_timestamp() WHERE id = jid AND status = 'ENQUEUED'
	RETURNING campaign_id INTO selected_campaign_id;

	WITH messages AS 
	(
    UPDATE sms_messages m 
    SET dequeued_at = clock_timestamp(), updated_at = clock_timestamp(), error_code = NULL, delivered_at = NULL, sent_at = NULL, received_at = NULL
    WHERE m.campaign_id = selected_campaign_id
    -- enqueue only those that have not been enqueued - this means that when we retry, we will have to set dequeued_at to null
    AND m.dequeued_at IS NULL
    -- check for message_id is null because we dont want to enqueue messages that have already been sent
    AND m.message_id is NULL
    RETURNING 
    id,
    campaign_id, 
    recipient, 
    params, 
    dequeued_at,
    created_at,
    updated_at
  )

	INSERT INTO sms_ops 
	(id,
	campaign_id, 
	recipient, 
	params, 
	dequeued_at,
	-- note that sent_at is not set. It remains as null so that the sending step will pick it up.
	-- note that delivered_at is not set. It remains as null so we can set it when the sending client responds.
	created_at,
	updated_at)  
	(SELECT * 
	 FROM messages);
END $$;
