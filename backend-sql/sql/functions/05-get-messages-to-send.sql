CREATE OR REPLACE FUNCTION get_messages_to_send(jid int, lim int) RETURNS TABLE(res_id int, res_recipient varchar(255), res_params json) 
LANGUAGE plpgsql AS $$
BEGIN
	RETURN QUERY
	-- Set sent_at for messages belonging to a job that is in SENDING state only (it will not pick up any other states like STOPPED or LOGGED)
	UPDATE email_ops SET sent_at=clock_timestamp() WHERE 
		id in (
			SELECT id FROM email_ops WHERE
			campaign_id = (SELECT q.id FROM job_queue q WHERE q.id = jid AND status = 'SENDING')
			AND sent_at IS NULL
			LIMIT lim
			FOR UPDATE SKIP LOCKED
		)
	RETURNING id, recipient, params;
	-- If there are no messages found, we assume the job is done
	-- This is only correct because enqueue and send are serialized. All messages are enqueued before sending occurs
	IF NOT FOUND THEN
		UPDATE job_queue SET status = 'SENT' where id = jid AND status = 'SENDING';
	END IF;
END $$;
