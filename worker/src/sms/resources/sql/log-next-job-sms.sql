CREATE OR REPLACE FUNCTION log_next_job_sms(out selected_campaign_id int)
 LANGUAGE plpgsql
AS $$
BEGIN
WITH logged_jobs AS ( 
	UPDATE job_queue SET status = 'LOGGED', worker_id = NULL, updated_at = clock_timestamp()
	WHERE campaign_id = ( SELECT q1.campaign_id
	    FROM job_queue q1, campaigns c1
	    WHERE
		c1.id = q1.campaign_id
		AND
		c1.type = 'SMS'
		AND
		-- if status is sent or stopped, we check that  
			-- all messages with sent_at have delivered_at
		-- else for any status - X time has passed since the most recent sent_at (in the case that the worker died and did not write back to some records)
		(
			(
				q1.status IN ('SENT','STOPPED')
				AND
					NOT EXISTS 
						( SELECT 1 FROM sms_ops p WHERE p.campaign_id = q1.campaign_id AND sent_at IS NOT NULL AND delivered_at IS NULL LIMIT  1)
			)
			OR
			(
				-- 20 seconds has passed since the most recent sent_at (the ops table has been stuck for a while)
				(SELECT EXTRACT(EPOCH FROM (clock_timestamp()-MAX(p.sent_at))) FROM sms_ops p WHERE p.campaign_id = q1.campaign_id) > 20 
			)
		)
	    FOR UPDATE SKIP LOCKED
	    LIMIT 1
	) RETURNING *
)
SELECT campaign_id INTO selected_campaign_id FROM logged_jobs LIMIT 1;

IF selected_campaign_id IS NOT NULL THEN
	PERFORM log_job_sms(selected_campaign_id);
END IF;
END $$