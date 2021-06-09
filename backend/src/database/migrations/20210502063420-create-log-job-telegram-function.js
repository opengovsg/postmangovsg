'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'log_job_telegram',
      [{ type: 'integer', name: 'selected_campaign_id' }],
      'void',
      'plpgsql',
      `
  UPDATE telegram_messages m
  -- reset dequeued_at so that errored messages can be retried
  SET dequeued_at = NULL,
    status = o.status::text::enum_telegram_messages_status,
    error_code = o.error_code,
    message_id = o.message_id,
    sent_at = o.sent_at,
    delivered_at = o.delivered_at,
    updated_at = clock_timestamp()
  FROM telegram_ops o
  WHERE o.campaign_id = selected_campaign_id
    AND o.id = m.id;

  DELETE FROM telegram_ops o
  WHERE o.campaign_id = selected_campaign_id;

  PERFORM update_stats_telegram(selected_campaign_id);
`,
      [],
      { force: true }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('log_job_telegram', [
      { type: 'integer', name: 'selected_campaign_id' },
    ])
  },
}
