'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.createFunction(
      'get_notification_data_by_campaign_id',
      [
        {
          type: 'int',
          name: 'campaign_id_input',
        },
      ],
      'json',
      'plpgsql',
      `
SELECT json_build_object('id', c.id,
'campaign_name', c.name,
'visible_at', c.visible_at,
'created_at', c.created_at,
'unsent_count', s.unsent,
'error_count', s.errored,
'sent_count', s.sent,
'invalid_count', s.invalid,
'notification_email', u.email,
'halted', c.halted) INTO result FROM campaigns c INNER JOIN statistics s ON c.id=s.campaign_id INNER JOIN users u ON c.user_id=u.id WHERE c.id=campaign_id_input;
      RETURN result;
      `,
      [],
      {
        force: true,
        variables: [{ type: 'json', name: 'result' }],
      }
    )
  },

  down: async (queryInterface, Sequelize) => {
    queryInterface.dropFunction('get_notification_data_by_campaign_id', [
      {
        type: 'int',
        name: 'campaign_id',
      },
    ])
  },
}
