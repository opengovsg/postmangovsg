import bcrypt from 'bcrypt'

process.env.APP_ENV = 'development'
process.env.REDIS_OTP_URI = 'redis://localhost:6379/3'
process.env.REDIS_SESSION_URI = 'redis://localhost:6379/4'
process.env.REDIS_RATE_LIMIT_URI = 'redis://localhost:6379/5'
process.env.REDIS_CREDENTIAL_URI = 'redis://localhost:6379/6'
process.env.SENDGRID_PUBLIC_KEY =
  'MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEKWFCI/58CSJe4uz9WX7VZZBIoeb3c1UEJ+pe3HL0ywyGA6c3Bq92+1YVKv0HHxf5mjm+t47P672gcaYarlp2LA=='
process.env.SESSION_SECRET = 'SESSIONSECRET'
process.env.DB_URI =
  'postgres://postgres:postgres@localhost:5432/postmangovsg_test'
process.env.BACKEND_SES_FROM = 'Postman <donotreply@mail.postman.gov.sg>'
process.env.API_KEY_SALT_V1 = bcrypt.genSaltSync(1)
process.env.TRANSACTIONAL_EMAIL_RATE = '1'
process.env.TWILIO_CREDENTIAL_CACHE_MAX_AGE = '0'
process.env.UPLOAD_REDIS_URI = 'redis://localhost:6379/6'
process.env.FLAMINGO_DB_URI =
  'postgres://postgres:postgres@localhost:5432/postmangovsg_test'
