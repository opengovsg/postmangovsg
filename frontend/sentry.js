/* eslint-disable */
const SentryClient = require('@sentry/cli')

async function createReleaseAndUpload() {
  const cli = new SentryClient()

  try {
    const release = process.env.REACT_APP_SENTRY_RELEASE

    console.log('Creating sentry release ' + release)
    await cli.releases.new(release)

    console.log('Uploading source maps')
    await cli.releases.uploadSourceMaps(release, {
      include: ['build/static/js'],
      urlPrefix: '~/static/js',
      validate: true
    })

    console.log('Finalizing release')
    await cli.releases.finalize(release)
  } catch (e) {
    console.error('Source maps uploading failed:', e)
  }
}

createReleaseAndUpload()
