'use strict'

module.exports = {
  up: async (queryInterface, _) => {
    await queryInterface.createFunction(
      'enqueue_messages_sms',
      [{ type: 'integer', name: 'jid' }],
      'void',
      'plpgsql',
      `
        -- only one worker will be able to set this job's status
        UPDATE job_queue SET status = 'SENDING', updated_at = clock_timestamp() WHERE id = jid AND status = 'ENQUEUED'
        RETURNING campaign_id INTO selected_campaign_id;

        WITH messages AS
        (
          UPDATE sms_messages m
          SET dequeued_at = clock_timestamp(), updated_at = clock_timestamp(), error_code = NULL, delivered_at = NULL, sent_at = NULL, received_at = NULL, status = NULL
          WHERE m.campaign_id = selected_campaign_id
          -- enqueue only those that have not been enqueued - when logger writes the ops back to messages, it will set dequeued_at to null so that messages can be retried.
          AND m.dequeued_at IS NULL
          -- enqueue only unsent or errored messages
          AND (m.status = 'ERROR' OR m.status IS NULL)
          RETURNING
          id,
          campaign_id,
          recipient,
          params,
          dequeued_at,
          created_at,
          updated_at
        )

        INSERT INTO sms_ops 
        (id,
        campaign_id, 
        recipient, 
        params, 
        dequeued_at,
        -- note that sent_at is not set. It remains as null so that the sending step will pick it up.
        -- note that delivered_at is not set. It remains as null so we can set it when the sending client responds.
        created_at,
        updated_at)  
        (SELECT * 
        FROM messages);
      `,
      [],
      {
        force: true,
        variables: [{ type: 'int', name: 'selected_campaign_id' }],
      }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropFunction('enqueue_messages_sms', [
      { type: 'integer', name: 'jid' },
    ])
  },
}
