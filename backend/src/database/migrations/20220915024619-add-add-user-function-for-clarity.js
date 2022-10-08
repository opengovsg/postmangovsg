'use strict';

/*
* add_user is not directly invoked in the codebase
* rather, it is used to make it easier to add email addresses that are not whitelisted
* e.g. usage SELECT add_user('blahblah@whatever.com');
* */

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'add_user',
      [{ type: 'text', name: 'email' }],
      'void',
      'plpgsql',
      `
      INSERT INTO users ("email", "updated_at", "created_at")
      VALUES (lower(email), clock_timestamp(), clock_timestamp()) RETURNING id
      INTO new_user;
      INSERT INTO user_demos (user_id, num_demos_sms, num_demos_telegram, is_displayed, created_at, updated_at)
          VALUES (new_user, 3, 3, TRUE, clock_timestamp(), clock_timestamp());
      `,
      [],
      {
        force: true,
        variables: [
          { type: 'integer', name: 'new_user' },
        ]
      }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('add_user', [
      { type: 'text', name: 'email' },
    ])
  }
};
