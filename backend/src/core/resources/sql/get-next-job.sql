CREATE OR REPLACE FUNCTION get_next_job(worker int, out selected_job_id int, out selected_campaign_id int, out selected_campaign_type text, out selected_rate int)
LANGUAGE plpgsql AS $$
BEGIN
UPDATE job_queue
SET worker_id = worker, status = 'ENQUEUED'
WHERE id = ( SELECT q.id
    FROM job_queue q, campaigns p, credentials c
    WHERE q.status = 'READY'
    AND q.campaign_id = p.id
    AND p.cred_name = c.name
    AND is_credential_used(p.id) IS NULL
    ORDER BY id ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
    -- Scans the queue table in job_queue.id order (our insertion order determines priority)
    -- Tries to acquire a lock on each row. If it fails to acquire the lock, it ignores the row as if it wasn’t in the table at all and carries on.
    -- Stops scanning once it’s locked one job
    -- Returns the id of the locked job
    -- Assigns that job with a worker (but this doesn’t take effect until commit)
)
RETURNING id, campaign_id, send_rate into selected_job_id, selected_campaign_id, selected_rate;
SELECT "type" into selected_campaign_type FROM campaigns WHERE id = selected_campaign_id;
END $$;
