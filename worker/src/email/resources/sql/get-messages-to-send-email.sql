CREATE OR REPLACE FUNCTION get_messages_to_send_email(jid int, lim int) 
RETURNS TABLE (result json)
LANGUAGE plpgsql AS $$
BEGIN
	RETURN QUERY
	-- Set sent_at for messages belonging to a job that is in SENDING state only (it will not pick up any other states like STOPPED or LOGGED)
	WITH
    selected_ids AS (
      SELECT id FROM email_ops WHERE
			campaign_id = (SELECT q.campaign_id FROM job_queue q WHERE q.id = jid AND status = 'SENDING')
			AND sent_at IS NULL
			LIMIT lim
			FOR UPDATE SKIP LOCKED
    ),
    messages AS (
      UPDATE email_ops SET sent_at=clock_timestamp(), updated_at = clock_timestamp() WHERE 
      id in (SELECT * from selected_ids)
      RETURNING id, recipient, params, campaign_id
    )
    SELECT json_build_object('id', m.id, 'recipient', m.recipient, 'params', m.params, 'campaignId', m.campaign_id, 'body', t.body, 'subject', t.subject, 'replyTo', t.reply_to)
    FROM messages m, email_templates t
    WHERE m.campaign_id = t.campaign_id;
END $$;
