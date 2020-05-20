-- Called by the core.retry_jobs() function
CREATE OR REPLACE FUNCTION retry_jobs_email(selected_campaign_id int) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE email_messages SET dequeued_at = NULL, updated_at = clock_timestamp() WHERE campaign_id = selected_campaign_id AND message_id IS NULL;
END $$

