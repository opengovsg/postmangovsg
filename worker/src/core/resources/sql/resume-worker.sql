CREATE OR REPLACE FUNCTION resume_worker(worker text)
 RETURNS void
 LANGUAGE plpgsql
AS $$
BEGIN
    -- Find a job that this worker was running and reset it so someone else can pick it up
    UPDATE job_queue q SET status = 'READY', worker_id = NULL, updated_at = clock_timestamp() WHERE worker_id = worker;
END $$
