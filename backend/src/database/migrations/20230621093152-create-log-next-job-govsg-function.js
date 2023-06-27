'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'log_next_job_govsg',
      [{ type: 'integer', name: 'selected_campaign_id', direction: 'OUT' }],
      'integer',
      'plpgsql',
      `
        WITH logged_jobs AS ( 
          UPDATE job_queue SET status = 'LOGGED', worker_id = NULL, updated_at = clock_timestamp()
          WHERE campaign_id = ( SELECT q1.campaign_id
              FROM job_queue q1, campaigns c1
              WHERE
            c1.id = q1.campaign_id
            AND
            c1.type = 'GOVSG'
            AND
            q1.status IN ('SENT','STOPPED')
            -- if status is sent or stopped, we check that  
              -- all messages with send_attempted_at have sent_at
              -- OR X time has passed since the most recent sent_at (in the case that the worker died and did not write back to some records)
            AND
            (
              (
                  NOT EXISTS 
                    ( SELECT 1 FROM govsg_ops p WHERE p.campaign_id = q1.campaign_id AND send_attempted_at IS NOT NULL AND sent_at IS NULL LIMIT 1 )
              )
              OR
              (
                -- 20 seconds has passed since the most recent send_attempted_at (the campaign has been stuck for a while in ops table)
                (SELECT EXTRACT(EPOCH FROM (clock_timestamp()-MAX(p.send_attempted_at))) FROM govsg_ops p WHERE p.campaign_id = q1.campaign_id) > 20 
              )
            )
              FOR UPDATE SKIP LOCKED
              LIMIT 1
          ) RETURNING *
        )
        SELECT campaign_id INTO selected_campaign_id FROM logged_jobs LIMIT 1;

        IF selected_campaign_id IS NOT NULL THEN
          PERFORM log_job_govsg(selected_campaign_id);
        END IF;
      `,
      [],
      { force: true }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('log_next_job_govsg', [
      { type: 'integer', name: 'selected_campaign_id', direction: 'OUT' },
    ])
  },
}
