'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'log_next_job_telegram',
      [{ type: 'integer', name: 'selected_campaign_id', direction: 'OUT' }],
      'integer',
      'plpgsql',
      `
WITH logged_jobs AS (
  UPDATE job_queue
  SET status = 'LOGGED', worker_id = NULL, updated_at = clock_timestamp()
  WHERE campaign_id = (
    SELECT job_queue.campaign_id
    FROM job_queue, campaigns
    WHERE job_queue.campaign_id = campaigns.id
      AND campaigns.type = 'TELEGRAM'
      AND job_queue.status IN ('SENT', 'STOPPED')
      AND (
        -- if status is sent or stopped, we check that
        -- all messages with sent_at have delivered_at
        NOT EXISTS (
          SELECT 1
          FROM telegram_ops
          WHERE telegram_ops.campaign_id = job_queue.campaign_id
            AND telegram_ops.sent_at IS NOT NULL
            AND telegram_ops.delivered_at IS NULL
          LIMIT 1
        )
        OR
        -- OR X time has passed since the most recent sent_at
        -- (in the case that the worker died and did not write back to some records)
        (
          SELECT EXTRACT (
            EPOCH FROM (clock_timestamp() - MAX(telegram_ops.sent_at))
          )
          FROM telegram_ops
          WHERE telegram_ops.campaign_id = job_queue.campaign_id
        ) > 20
      )
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING campaign_id
)
SELECT campaign_id
INTO selected_campaign_id
FROM logged_jobs
LIMIT 1;

IF selected_campaign_id IS NOT NULL THEN
  PERFORM log_job_telegram(selected_campaign_id);
END IF;
`,
      [],
      { force: true }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('log_next_job_telegram', [
      { type: 'integer', name: 'selected_campaign_id', direction: 'OUT' },
    ])
  },
}
