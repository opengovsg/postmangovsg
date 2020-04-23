CREATE OR REPLACE FUNCTION stop_jobs(selected_campaign_id int) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
UPDATE job_queue SET status = 'STOPPED' WHERE campaign_id = selected_campaign_id AND status <> 'LOGGED';
END $$