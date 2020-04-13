CREATE OR REPLACE FUNCTION log_next_job(out selected_campaign_id int)
 LANGUAGE plpgsql
AS $$
BEGIN

WITH logged_jobs AS ( 
	UPDATE job_queue SET status = 'LOGGED'
	WHERE campaign_id IN ( SELECT q1.campaign_id
	    FROM job_queue q1
	    WHERE 
		(
			-- if status is sent, then we need to check all messages have delivered_at (meaning the sending client had responded)
			q1.status = 'SENT' 
			AND
			NOT EXISTS ( SELECT 1 FROM email_ops p WHERE p.campaign_id = q1.campaign_id AND  delivered_at IS NULL LIMIT 1) 
		)
		OR
		(  
			-- if status is stopped, then we need to check that all messages with sent_at, also have delivered_at.
			q1.status = 'STOPPED'
			AND
			NOT EXISTS ( SELECT 1 FROM email_ops p WHERE p.campaign_id = q1.campaign_id AND sent_at IS NOT NULL AND delivered_at IS NULL LIMIT  1) 
		)
	    FOR UPDATE SKIP LOCKED
	    LIMIT 1
	) RETURNING *
)
SELECT campaign_id INTO selected_campaign_id FROM logged_jobs LIMIT 1;


UPDATE email_messages m 
SET dequeued_at = p.dequeued_at,
	error_code = p.error_code,
	message_id = p.message_id,
	sent_at = p.sent_at,
	delivered_at = p.delivered_at,
	received_at = p.received_at,
	updated_at = p.updated_at
FROM email_ops p WHERE 
p.campaign_id = selected_campaign_id 
AND m.campaign_id = p.campaign_id
AND m.recipient = p.recipient;

DELETE FROM email_ops p WHERE  p.campaign_id = selected_campaign_id;

END $$;
