CREATE OR REPLACE FUNCTION log_next_job(out selected_campaign_id int) 
 LANGUAGE plpgsql
AS $$
BEGIN

WITH logged_jobs AS ( 
	UPDATE job_queue SET status = 'LOGGED', worker_id = NULL
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

-- NOTE: THIS CALLS SPECIFIC FUNCTIONS FOR CHANNEL TYPES
-- I prefer not to call channel functions within a function because
-- although the transaction will still fail when the inner function fails,
-- 1) you have to remember to specify a new channel (eg whatsapp) function inside this sql statement
-- 2) the query planner might not be able to optimize this function

-- I had to call the channel functions here because the worker does not know what job it has picked to log until it runs the above statement
-- which also has to be wrapped in the same transaction as the update to ground truth table, and deletion of campaign in ops table. 

-- With regard to point 2), since logging is a task that can be deferred, its performance is not as much of an issue.
PERFORM 
	CASE WHEN type = 'EMAIL' THEN log_job_email(selected_campaign_id)
	WHEN type = 'SMS' THEN log_job_sms(selected_campaign_id)
	END
FROM campaigns where id = selected_campaign_id;

END $$;
