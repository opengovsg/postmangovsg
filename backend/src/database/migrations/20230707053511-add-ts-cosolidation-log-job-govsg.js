'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('govsg_messages', 'deleted_by_user_at', {
      type: Sequelize.DataTypes.DATE,
      allowNull: true,
    })
    await queryInterface.addColumn(
      'govsg_messages_transactional',
      'deleted_by_user_at',
      {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      }
    )
    await queryInterface.addColumn('govsg_ops', 'deleted_by_user_at', {
      type: Sequelize.DataTypes.DATE,
      allowNull: true,
    })
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
          sent_at = COALESCE(m.sent_at, p.sent_at),
          delivered_at = COALESCE(m.delivered_at, p.delivered_at),
          read_at = COALESCE(m.read_at, p.read_at),
          errored_at = COALESCE(m.errored_at, p.errored_at),
          deleted_by_user_at = COALESCE(m.deleted_by_user_at, p.deleted_by_user_at),
          accepted_at = p.accepted_at,
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

  down: async (queryInterface, Sequelize) => {
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
          accepted_at = p.accepted_at,
          updated_at = clock_timestamp()
        FROM govsg_ops p WHERE
        m.id = p.id;

        DELETE FROM govsg_ops p WHERE  p.campaign_id = selected_campaign_id;

        PERFORM update_stats_govsg(selected_campaign_id);
      `,
      [],
      { force: true }
    )
    await queryInterface.removeColumn('govsg_messages', 'deleted_by_user_at')
    await queryInterface.removeColumn(
      'govsg_messages_transactional',
      'deleted_by_user_at'
    )
    await queryInterface.removeColumn('govsg_ops', 'deleted_by_user_at')
  },
}
