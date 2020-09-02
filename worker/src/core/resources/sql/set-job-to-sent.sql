CREATE OR REPLACE FUNCTION set_job_to_sent(job_id int) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
-- Set status to sent so that the logger will finalize it
UPDATE job_queue SET status = 'SENT', updated_at = clock_timestamp() where id = job_id AND status = 'SENDING';
END $$