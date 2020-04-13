CREATE OR REPLACE FUNCTION insert_job(selected_campaign_id int, selected_send_rate int) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
INSERT INTO job_queue ("campaign_id", "send_rate", "status", "created_at", "updated_at")
VALUES (selected_campaign_id, selected_send_rate, 'READY', clock_timestamp(), clock_timestamp());
END $$