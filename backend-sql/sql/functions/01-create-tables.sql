

DO $$
DECLARE 
enum_job_queue_status_exists BOOLEAN;
enum_campaigns_type_exists BOOLEAN;
BEGIN
-- copied from sequelize
SELECT TRUE INTO enum_job_queue_status_exists from pg_type where typname = 'enum_job_queue_status';
IF enum_job_queue_status_exists IS NULL THEN
    CREATE TYPE "public"."enum_job_queue_status" AS ENUM('READY', 'ENQUEUED', 'SENDING', 'SENT', 'STOPPED', 'LOGGED');
END IF;
SELECT TRUE INTO enum_campaigns_type_exists from pg_type where typname = 'enum_campaigns_type';
IF enum_campaigns_type_exists IS NULL THEN
    CREATE TYPE "public"."enum_campaigns_type" AS ENUM('SMS', 'EMAIL');
END IF;
CREATE TABLE IF NOT EXISTS "credentials" ("name" VARCHAR(255) NOT NULL , "used" BOOLEAN NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("name"));
CREATE TABLE IF NOT EXISTS "users" ("id"   SERIAL , "email" VARCHAR(255) NOT NULL, "api_key" VARCHAR(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));
CREATE TABLE IF NOT EXISTS "campaigns" ("id"   SERIAL , "name" VARCHAR(255) NOT NULL, "user_id" INTEGER REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE CASCADE, "type" "public"."enum_campaigns_type" NOT NULL, "cred_name" VARCHAR(255) REFERENCES "credentials" ("name") ON DELETE NO ACTION ON UPDATE CASCADE, "s3_object" JSON, "valid" BOOLEAN NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));
CREATE TABLE IF NOT EXISTS "workers" ("id"   SERIAL , "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));
CREATE TABLE IF NOT EXISTS "job_queue" ("id"   SERIAL , "campaign_id" INTEGER REFERENCES "campaigns" ("id") ON DELETE NO ACTION ON UPDATE CASCADE, "worker_id" INTEGER REFERENCES "workers" ("id") ON DELETE NO ACTION ON UPDATE CASCADE, "send_rate" INTEGER, "status" "public"."enum_job_queue_status" NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("id"));
CREATE TABLE IF NOT EXISTS "email_messages" ("campaign_id" INTEGER  REFERENCES "campaigns" ("id") ON DELETE NO ACTION ON UPDATE CASCADE, "recipient" VARCHAR(255) , "params" JSON, "message_id" VARCHAR(255), "error_code" VARCHAR(255), "dequeued_at" TIMESTAMP WITH TIME ZONE, "sent_at" TIMESTAMP WITH TIME ZONE, "delivered_at" TIMESTAMP WITH TIME ZONE, "received_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("campaign_id","recipient"));
CREATE TABLE IF NOT EXISTS "email_templates" ("campaign_id" INTEGER  REFERENCES "campaigns" ("id") ON DELETE NO ACTION ON UPDATE CASCADE, "body" TEXT, "subject" TEXT, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("campaign_id"));
-- ops table
CREATE TABLE IF NOT EXISTS "email_ops" ("campaign_id" INTEGER  REFERENCES "campaigns" ("id") ON DELETE NO ACTION ON UPDATE CASCADE, "recipient" VARCHAR(255) , "params" JSON, "message_id" VARCHAR(255), "error_code" VARCHAR(255), "dequeued_at" TIMESTAMP WITH TIME ZONE, "sent_at" TIMESTAMP WITH TIME ZONE, "delivered_at" TIMESTAMP WITH TIME ZONE, "received_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, 
id SERIAL PRIMARY KEY);
END$$;