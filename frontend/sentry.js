/* eslint-disable no-console */
import SentryClient from '@sentry/cli'

async function createReleaseAndUpload() {
  const cli = new SentryClient()

  try {
    const release = cli.releases.proposeVersion()

    console.log('Creating sentry release ' + release)
    await cli.releases.new(release)

    console.log('Uploading source maps')
    await cli.releases.uploadSourceMaps(release, {
      include: ['build/static/js'],
      urlPrefix: '~/static/js',
      rewrite: false,
    })

    console.log('Finalizing release')
    await cli.releases.finalize(release)
  } catch (e) {
    console.error('Source maps uploading failed:', e)
  }
}

createReleaseAndUpload()
