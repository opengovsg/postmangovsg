#!/usr/bin/env bash
concurrently  \
"./scripts/wait-for-it.sh localhost:30001 -t 0 && npx sequelize db:migrate --env record --migrations-path src/db/migrations/record" \
"./scripts/wait-for-it.sh localhost:30002 -t 0 && npx sequelize db:migrate --env art --migrations-path src/db/migrations/art" \
"./scripts/wait-for-it.sh localhost:30003 -t 0 && npx sequelize db:migrate --env appointment --migrations-path src/db/migrations/appointment && npx sequelize db:seed:all --env appointment --seeders-path src/db/seeders/appointment" \
"./scripts/wait-for-it.sh localhost:30004 -t 0 && npx sequelize db:migrate --env clinic --migrations-path src/db/migrations/clinic && npx sequelize db:seed:all --env clinic --seeders-path src/db/seeders/clinic"

