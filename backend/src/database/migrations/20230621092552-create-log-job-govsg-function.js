'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'log_job_govsg',
      [{ type: 'integer', name: 'selected_campaign_id' }],
      'void',
      'plpgsql',
      `
        UPDATE govsg_messages m 
        -- setting dequeued_at to null so it can be retried if needed
        SET dequeued_at = NULL,
          -- coalesced fields should prioritise message table over ops table
          -- because callbacks might arrive before logging
          status = CASE
              WHEN m.status = 'UNSENT' THEN COALESCE(p.status, m.status)
              ELSE COALESCE(m.status, p.status)
            END,
          error_code = COALESCE(m.error_code, p.error_code),
          error_description = COALESCE(m.error_description, p.error_description),
          service_provider_message_id = p.service_provider_message_id,
          send_attempted_at = p.send_attempted_at,
          sent_at = p.sent_at,
          read_at = COALESCE(m.read_at, p.read_at),
          updated_at = clock_timestamp()
        FROM govsg_ops p WHERE
        m.id = p.id;

        DELETE FROM govsg_ops p WHERE  p.campaign_id = selected_campaign_id;

        PERFORM update_stats_govsg(selected_campaign_id);
      `,
      [],
      { force: true }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('log_job_govsg', [
      { type: 'integer', name: 'selected_campaign_id' },
    ])
  },
}
