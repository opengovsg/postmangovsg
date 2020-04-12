CREATE OR REPLACE FUNCTION log_next_job(out selected_campaign_id int)
 LANGUAGE plpgsql
AS $$
BEGIN

WITH logged_jobs AS ( 
	UPDATE job_queue SET status = 'LOGGED'
	WHERE campaign_id IN ( SELECT q1.campaign_id
	    FROM job_queue q1
	    WHERE q1.status IN ('SENT','STOPPED')
		AND NOT EXISTS (
			-- Check that all of the jobs have been stopped or sent for this campaign id
			SELECT 1 FROM job_queue q2 WHERE q2.campaign_id = q1.campaign_id AND status NOT IN ('SENT', 'STOPPED', 'LOGGED') LIMIT 1
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
FROM email_ops p WHERE p.campaign_id = selected_campaign_id 
AND m.recipient = p.recipient;

DELETE FROM email_ops p WHERE  p.campaign_id = selected_campaign_id;

END $$;
