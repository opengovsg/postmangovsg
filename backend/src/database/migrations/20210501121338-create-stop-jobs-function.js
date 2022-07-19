'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'stop_jobs',
      [{ type: 'integer', name: 'selected_campaign_id' }],
      'void',
      'plpgsql',
      `
UPDATE job_queue SET status = 'STOPPED', updated_at = clock_timestamp() WHERE campaign_id = selected_campaign_id AND status <> 'LOGGED';
`,
      [],
      { force: true }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('stop_jobs', [
      { type: 'integer', name: 'selected_campaign_id' },
    ])
  },
}
