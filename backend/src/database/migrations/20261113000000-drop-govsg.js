'use strict'

// Removes the GovSG (WhatsApp) channel's own tables, type and functions, and
// the experimental-user flags only GovSG used.

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const query = (sql) => queryInterface.sequelize.query(sql, { transaction })

      // Children before parents
      await query('DROP TABLE IF EXISTS govsg_verification;')
      await query('DROP TABLE IF EXISTS govsg_messages_transactional;')
      await query('DROP TABLE IF EXISTS govsg_templates_access;')
      await query('DROP TABLE IF EXISTS campaign_govsg_template;')
      await query('DROP TABLE IF EXISTS govsg_ops;')
      await query('DROP TABLE IF EXISTS govsg_messages;')
      await query('DROP TABLE IF EXISTS govsg_templates;')
      await query('DROP TYPE IF EXISTS enum_govsg_messages_status;')
      await query('DROP TABLE IF EXISTS user_experimental;')

      await query('DROP FUNCTION IF EXISTS log_next_job_govsg();')
      await query('DROP FUNCTION IF EXISTS log_job_govsg(integer);')
      await query('DROP FUNCTION IF EXISTS update_stats_govsg(integer);')
      await query(
        'DROP FUNCTION IF EXISTS get_messages_to_send_govsg(integer, integer);'
      )
      await query('DROP FUNCTION IF EXISTS enqueue_messages_govsg(integer);')
    })
  },

  down: async () => {
    throw new Error(
      'Dropping the GovSG tables is irreversible. Restore from the pre-migration snapshot.'
    )
  },
}
