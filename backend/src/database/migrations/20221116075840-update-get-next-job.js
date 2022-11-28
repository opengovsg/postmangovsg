'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createFunction(
      'get_next_job',
      [{ type: 'text', name: 'worker' }],
      'json',
      'plpgsql',
      `
      UPDATE job_queue
      SET worker_id = worker, status = 'ENQUEUED', updated_at = clock_timestamp()
      WHERE
      -- worker is not already operating on a job
      NOT EXISTS (SELECT 1 FROM job_queue q WHERE q.worker_id = worker LIMIT 1)
      AND id = ( SELECT q.id
          FROM job_queue q, campaigns p, credentials c
          WHERE q.status = 'READY'
          AND q.campaign_id = p.id
          AND p.cred_name = c.name
          AND is_credential_used(p.id) IS NULL
          AND q.visible_at <= clock_timestamp()
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

      SELECT json_build_object('job_id', selected_job_id, 'campaign_id', selected_campaign_id, 'rate', selected_rate, 'type', "type", 'cred_name', "cred_name") INTO result FROM campaigns WHERE id = selected_campaign_id;
      RETURN result;
      `,
      [],
      {
        force: true,
        variables: [
          { type: 'int', name: 'selected_job_id' },
          { type: 'int', name: 'selected_campaign_id' },
          { type: 'int', name: 'selected_rate' },
          { type: 'json', name: 'result' },
        ],
      }
    )
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.createFunction(
      'get_next_job',
      [{ type: 'text', name: 'worker' }],
      'json',
      'plpgsql',
      `
      UPDATE job_queue
      SET worker_id = worker, status = 'ENQUEUED', updated_at = clock_timestamp()
      WHERE
      -- worker is not already operating on a job
      NOT EXISTS (SELECT 1 FROM job_queue q WHERE q.worker_id = worker LIMIT 1)
      AND id = ( SELECT q.id
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

      SELECT json_build_object('job_id', selected_job_id, 'campaign_id', selected_campaign_id, 'rate', selected_rate, 'type', "type", 'cred_name', "cred_name") INTO result FROM campaigns WHERE id = selected_campaign_id;
      RETURN result;
      `,
      [],
      {
        force: true,
        variables: [
          { type: 'int', name: 'selected_job_id' },
          { type: 'int', name: 'selected_campaign_id' },
          { type: 'int', name: 'selected_rate' },
          { type: 'json', name: 'result' },
        ],
      }
    )
  },
}
