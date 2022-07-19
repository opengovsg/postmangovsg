'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'update_stats_email',
      [{ type: 'integer', name: 'selected_campaign_id' }],
      'void',
      'plpgsql',
      `
-- Archive number of unsent, errored and sent email messages in statistics table
WITH stats AS (
  SELECT
    COUNT(*) FILTER (WHERE status IS NULL) AS unsent,
    COUNT(*) FILTER (WHERE status = 'ERROR') AS errored,
    COUNT(*) FILTER (WHERE status = 'SENDING' OR status = 'SUCCESS') AS sent,
    COUNT(*) FILTER (WHERE status = 'INVALID_RECIPIENT') AS invalid
  FROM email_messages
  WHERE campaign_id = selected_campaign_id
)
INSERT INTO statistics (campaign_id, unsent, errored, invalid, sent, updated_at, created_at)
SELECT selected_campaign_id, unsent, errored, invalid, sent, now(), now() FROM stats
ON CONFLICT (campaign_id) DO UPDATE
SET
  unsent = excluded.unsent,
  errored = excluded.errored,
  sent = excluded.sent,
  invalid = excluded.invalid,
  updated_at = excluded.updated_at;
`,
      [],
      { force: true }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('update_stats_email', [
      { type: 'integer', name: 'selected_campaign_id' },
    ])
  },
}
