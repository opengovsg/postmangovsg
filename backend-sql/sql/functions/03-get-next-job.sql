-- Postman Job Status Query next job query
-- Notes:
-- FOR UPDATE will lock selected rows
-- In this case, 1 row from credential, campaign and job_queue each
-- SKIP LOCKED will look for the next unlocked row

-- Do we need a constraint on job_queue such that a worker_id can only be associated with 1 row whose status is 'ENQUEUED'?

-- https://www.postgresql.org/docs/11/plpgsql-transactions.html
-- Transaction control is only possible in CALL or DO invocations from the top level or nested CALL or DO invocations without any other intervening command. 

CREATE OR REPLACE FUNCTION get_next_job(worker int, out selected_job_id int, out selected_campaign_id int)
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
RETURNING id, campaign_id into selected_job_id, selected_campaign_id;
END $$;


