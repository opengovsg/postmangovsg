CREATE OR REPLACE FUNCTION resume_worker(worker int) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE selected_campaign_id int;
BEGIN
    SELECT campaign_id INTO selected_campaign_id FROM job_queue WHERE worker_id=worker AND status IN ('ENQUEUED', 'SENDING') LIMIT 1;
    IF selected_campaign_id IS NOT NULL THEN
        PERFORM stop_jobs(selected_campaign_id);
        -- TODO: It should restart the jobs but I'm not sure how to write the queries yet
    END IF;
    
END $$