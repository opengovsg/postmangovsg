'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'log_job_email',
      [{ type: 'integer', name: 'selected_campaign_id' }],
      'void',
      'plpgsql',
      `
        UPDATE email_messages m
          -- setting dequeued_at to null so it can be retried if needed
        SET dequeued_at = NULL,
          -- coalesced fields should prioritise message table over ops table
          -- because callbacks might arrive before logging
          error_code = COALESCE(m.error_code, p.error_code),
            status = COALESCE(m.status, p.status),
          sent_at = p.sent_at,
          delivered_at = p.delivered_at,
          received_at = COALESCE(m.received_at, p.received_at),
          updated_at = clock_timestamp()
        FROM email_ops p WHERE
        m.id = p.id;

        DELETE FROM email_ops p WHERE  p.campaign_id = selected_campaign_id;

        PERFORM update_stats_email(selected_campaign_id);
      `,
      [],
      { force: true }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('log_job_email', [
      { type: 'integer', name: 'selected_campaign_id' },
    ])
  },
}
