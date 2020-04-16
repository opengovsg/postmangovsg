CREATE OR REPLACE FUNCTION resume_worker(worker integer)
 RETURNS void
 LANGUAGE plpgsql
AS $$
DECLARE selected_campaign_id int; logged_campaign_id int;
BEGIN
    -- Find a campaign that this worker was running
    SELECT campaign_id INTO selected_campaign_id FROM job_queue WHERE worker_id=worker AND status IN ('ENQUEUED', 'SENDING') LIMIT 1;
    IF selected_campaign_id IS NOT NULL THEN

            -- Attempt to log that campaign
            UPDATE job_queue q SET status = 'LOGGED', worker_id = NULL WHERE campaign_id = selected_campaign_id 
            -- Should we check for existing jobs that are running for this campaign?
            RETURNING q.campaign_id INTO logged_campaign_id;

            -- If we managed to update the status
            IF logged_campaign_id IS NOT NULL THEN 
            -- Then do the logging
                PERFORM 
                    CASE WHEN type = 'EMAIL' THEN log_job_email(logged_campaign_id)
                    WHEN type = 'SMS' THEN log_job_sms(logged_campaign_id)
                    END
                FROM campaigns where id = logged_campaign_id;
            -- Set the status back to ready so that another worker can pick it up to continue sending
                PERFORM retry_jobs(logged_campaign_id);
            END IF;

    END IF;
    
END $$
