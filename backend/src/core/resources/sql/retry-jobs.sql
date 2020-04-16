CREATE OR REPLACE FUNCTION retry_jobs(selected_campaign_id int) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE retry_disabled BOOLEAN;
BEGIN
-- Check that all of the jobs have been logged for this campaign id
SELECT TRUE INTO retry_disabled FROM job_queue q WHERE q.campaign_id = selected_campaign_id AND status <> 'LOGGED' LIMIT 1;

IF retry_disabled IS NULL THEN

    -- NOTE: THIS CALLS SPECIFIC FUNCTIONS FOR CHANNEL TYPES
    PERFORM 
        CASE WHEN type = 'EMAIL' THEN retry_jobs_email(selected_campaign_id)
        WHEN type = 'SMS' THEN retry_jobs_sms(selected_campaign_id)
	    END
    FROM campaigns where id = selected_campaign_id;

    UPDATE job_queue SET status = 'READY', worker_id = NULL WHERE campaign_id = selected_campaign_id;

END IF;

END $$

