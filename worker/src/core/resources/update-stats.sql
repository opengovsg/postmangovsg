CREATE OR REPLACE FUNCTION update_stats(selected_campaign_id int) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN

PERFORM 
  CASE
    WHEN type = 'EMAIL' THEN update_stats_email(selected_campaign_id)
    WHEN type = 'SMS' THEN update_stats_sms(selected_campaign_id)
  END
FROM campaigns where id = selected_campaign_id;

END $$

