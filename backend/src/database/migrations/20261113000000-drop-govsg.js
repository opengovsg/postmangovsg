'use strict'

// Removes the GovSG (WhatsApp) channel. It had no production users, so all of
// its data is dropped.
//
// 'GOVSG' stays in enum_campaigns_type: Postgres cannot drop an enum value
// without recreating the type and rewriting the campaigns table. No campaign
// row uses it after this migration, and ChannelType no longer offers it.

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const query = (sql) => queryInterface.sequelize.query(sql, { transaction })

      // Rows in shared tables that point at GOVSG campaigns
      for (const table of [
        'job_queue',
        'statistics',
        'unsubscribers',
        'protected_messages',
        'managed_list_campaigns',
      ]) {
        await query(
          `DELETE FROM ${table} WHERE campaign_id IN (SELECT id FROM campaigns WHERE type = 'GOVSG');`
        )
      }

      // GovSG tables, children before parents
      await query('DROP TABLE IF EXISTS govsg_verification;')
      await query('DROP TABLE IF EXISTS govsg_messages_transactional;')
      await query('DROP TABLE IF EXISTS govsg_templates_access;')
      await query('DROP TABLE IF EXISTS campaign_govsg_template;')
      await query('DROP TABLE IF EXISTS govsg_ops;')
      await query('DROP TABLE IF EXISTS govsg_messages;')
      await query('DROP TABLE IF EXISTS govsg_templates;')
      await query('DROP TYPE IF EXISTS enum_govsg_messages_status;')

      await query("DELETE FROM campaigns WHERE type = 'GOVSG';")

      // Default credential added by the 20230621021627-add-default-govsg-creds seeder
      await query("DELETE FROM user_credentials WHERE cred_name = 'GOVSG_DEFAULT';")
      await query("DELETE FROM credentials WHERE name = 'GOVSG_DEFAULT';")

      // Experimental-user flags; GovSG was their only user
      await query('DROP TABLE IF EXISTS user_experimental;')

      // GovSG PL/pgSQL functions. No other function calls them.
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
      'Dropping the GovSG channel is irreversible. Restore from the pre-migration snapshot.'
    )
  },
}
