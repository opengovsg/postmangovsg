'use strict'

const { GovsgMessageStatus } = require('@core/constants')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      "ALTER TYPE enum_campaigns_type ADD VALUE 'GOVSG';"
    )
    await queryInterface.createTable('govsg_messages', {
      id: {
        autoIncrement: true,
        type: Sequelize.DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
      },
      campaign_id: {
        type: Sequelize.DataTypes.BIGINT,
        allowNull: true,
        references: {
          model: 'campaigns',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
      recipient: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
      },
      params: {
        type: Sequelize.DataTypes.JSONB,
        allowNull: true,
      },
      service_provider_message_id: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
      },
      error_code: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
      },
      error_description: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        allowNull: true,
        type: Sequelize.DataTypes.ENUM(Object.values(GovsgMessageStatus)),
      },
      accepted_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      send_attempted_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      sent_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      delivered_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      read_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      errored_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
    })
    await queryInterface.createTable('govsg_templates', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      body: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      params: {
        type: Sequelize.DataTypes.JSONB,
        allowNull: true,
      },
      whatsapp_template_label: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: false,
      },
      name: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
    })
    await queryInterface.createTable('campaign_govsg_template', {
      id: {
        autoIncrement: true,
        type: Sequelize.DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
      },
      campaign_id: {
        type: Sequelize.DataTypes.BIGINT,
        allowNull: true,
        references: {
          model: 'campaigns',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
      govsg_template_id: {
        type: Sequelize.DataTypes.BIGINT,
        allowNull: true,
        references: {
          model: 'govsg_templates',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
    })
    await queryInterface.createTable('govsg_ops', {
      id: {
        autoIncrement: true,
        type: Sequelize.DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
      },
      campaign_id: {
        type: Sequelize.DataTypes.BIGINT,
        allowNull: true,
        references: {
          model: 'campaigns',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
      recipient: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
      },
      params: {
        type: Sequelize.DataTypes.JSONB,
        allowNull: true,
      },
      service_provider_message_id: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
      },
      error_code: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
      },
      error_description: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: 'enum_govsg_messages_status',
        allowNull: true,
      },
      accepted_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      send_attempted_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      sent_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      delivered_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      read_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      errored_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
    })
    await queryInterface.createTable('govsg_messages_transactional', {
      id: {
        autoIncrement: true,
        type: Sequelize.DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
      },
      template_id: {
        type: Sequelize.DataTypes.BIGINT,
        allowNull: true,
        references: {
          model: 'govsg_templates',
          key: 'id',
        },
        onUpdate: 'CASCADE',
      },
      recipient: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
      },
      params: {
        type: Sequelize.DataTypes.JSONB,
        allowNull: true,
      },
      service_provider_message_id: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
      },
      error_code: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: true,
      },
      error_description: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: 'enum_govsg_messages_status',
        allowNull: true,
      },
      accepted_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      sent_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      delivered_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      read_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      errored_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
    })
  },

  down: async (queryInterface, _) => {
    await queryInterface.dropTable('govsg_messages_transactional')
    await queryInterface.dropTable('govsg_ops')
    await queryInterface.dropTable('campaign_govsg_template')
    await queryInterface.dropTable('govsg_templates')
    await queryInterface.dropTable('govsg_messages')
    await queryInterface.sequelize.query(`
      DELETE FROM job_queue WHERE campaign_id IN (SELECT id FROM campaigns WHERE type = 'GOVSG');
      DELETE FROM campaigns WHERE type = 'GOVSG';
      ALTER TYPE enum_campaigns_type RENAME TO _enum_campaigns_type;
      CREATE TYPE enum_campaigns_type AS ENUM('SMS', 'EMAIL', 'TELEGRAM');
      ALTER TABLE campaigns ALTER COLUMN type TYPE enum_campaigns_type USING type::text::enum_campaigns_type;
      DROP TYPE _enum_campaigns_type;
    `)
  },
}
