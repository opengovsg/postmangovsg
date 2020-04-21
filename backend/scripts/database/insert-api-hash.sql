-- Copy and paste this into the sql query.
-- Make sure to change the values ie: 'HASH', 'EMAIL'

UPDATE "users"
SET "api_key" = 'HASH', "updated_at" = clock_timestamp()
WHERE "email" = 'EMAIL';