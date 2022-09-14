'use strict'

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
    await queryInterface.createFunction(
      'format_user_on_insert',
      [],
      'trigger',
      'plpgsql',
      `
      NEW.email = LOWER(NEW.email);
      NEW.api_key = CASE WHEN NEW.api_key='' THEN NULL ELSE NEW.api_key END;
      RETURN NEW;      
      `,
      [],
      { force: true }
    )
    await queryInterface.createFunction(
      'log_next_job',
      [{ type: 'integer', direction: 'OUT', name: 'selected_campaign_id' }],
      'integer',
      'plpgsql',
      `
      WITH logged_jobs AS (
          UPDATE job_queue SET status = 'LOGGED', worker_id = NULL
              WHERE campaign_id IN (SELECT q1.campaign_id
                  FROM job_queue q1
                  WHERE (
                      -- if status is sent, then we need to check all messages have delivered_at (meaning the sending client had responded)
                              q1.status = 'SENT'
                          AND
                              NOT EXISTS(SELECT 1
                                         FROM email_ops p
                                         WHERE p.campaign_id = q1.campaign_id
                                           AND delivered_at IS NULL
                                         LIMIT 1)
                      )
                     OR (
                      -- if status is stopped, then we need to check that all messages with sent_at, also have delivered_at.
                              q1.status = 'STOPPED'
                          AND
                              NOT EXISTS(SELECT 1
                                         FROM email_ops p
                                         WHERE p.campaign_id = q1.campaign_id
                                           AND sent_at IS NOT NULL
                                           AND delivered_at IS NULL
                                         LIMIT 1)
                      )
                      FOR UPDATE SKIP LOCKED
                  LIMIT 1) RETURNING *)
      SELECT campaign_id
      INTO selected_campaign_id
      FROM logged_jobs
      LIMIT 1;
      -- NOTE: THIS CALLS SPECIFIC FUNCTIONS FOR CHANNEL TYPES
      -- I prefer not to call channel functions within a function because
      -- although the transaction will still fail when the inner function fails,
      -- 1) you have to remember to specify a new channel (eg whatsapp) function inside this sql statement
      -- 2) the query planner might not be able to optimize this function

      -- I had to call the channel functions here because the worker does not know what job it has picked to log until it runs the above statement
      -- which also has to be wrapped in the same transaction as the update to ground truth table, and deletion of campaign in ops table. 

      -- With regard to point 2), since logging is a task that can be deferred, its performance is not as much of an issue.
      
      PERFORM
        CASE WHEN type = 'EMAIL' THEN log_job_email(selected_campaign_id)
        WHEN type = 'SMS' THEN log_job_sms(selected_campaign_id)
        END
      FROM campaigns where id = selected_campaign_id;
      `,
      [],
      { force: true }
    )
    await queryInterface.createFunction(
      'retry_jobs_email',
      [{ type: 'integer',  name: 'selected_campaign_id' }],
      'void',
      'plpgsql',
      `
      UPDATE email_messages SET dequeued_at = NULL, updated_at = clock_timestamp() WHERE campaign_id = selected_campaign_id AND message_id IS NULL;
      `,
      [],
      { force: true }
    )
    await queryInterface.createFunction(
      'retry_jobs_sms',
      [{ type: 'integer', name: 'selected_campaign_id' }],
      'void',
      'plpgsql',
      `
      UPDATE sms_messages SET dequeued_at = NULL, updated_at = clock_timestamp() WHERE campaign_id = selected_campaign_id AND message_id IS NULL;
      `,
      [],
      { force: true }
    )
    await queryInterface.createFunction(
      'update_stats',
      [{ type: 'integer', name: 'selected_campaign_id' }],
      'void',
      'plpgsql',
      `
      -- NOTE: THIS CALLS SPECIFIC FUNCTIONS FOR CHANNEL TYPES
      PERFORM 
        CASE
          WHEN type = 'EMAIL' THEN update_stats_email(selected_campaign_id)
          WHEN type = 'SMS' THEN update_stats_sms(selected_campaign_id)
        END
      FROM campaigns where id = selected_campaign_id;
      `,
      [],
      { force: true }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('add_user', [
      { type: 'text', name: 'email' },
    ])
    await queryInterface.dropFunction('format_user_on_insert', [])
    await queryInterface.dropFunction('log_next_job', [
      { type: 'integer', direction: 'OUT', name: 'selected_campaign_id' },
    ])
    await queryInterface.dropFunction(
      'retry_jobs_email', [
      { type: 'integer', name: 'selected_campaign_id' },
    ])
    await queryInterface.dropFunction('retry_jobs_sms', [
      { type: 'integer',  name: 'selected_campaign_id' },
    ])
    await queryInterface.dropFunction('update_stats', [
      { type: 'integer', name: 'selected_campaign_id' },
    ])
  },
}
