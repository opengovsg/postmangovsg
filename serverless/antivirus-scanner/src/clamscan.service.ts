import NodeClam from 'clamscan'
import internal from 'stream'

export async function scanFileStream(stream: internal.Readable) {
  const scanner = await new NodeClam().init({
    clamdscan: {
      socket: '/tmp/clamd.ctl',
    },
  })

  const { isInfected: isMalicious, viruses: virusMetadata } =
    await scanner.scanStream(stream)

  return { isMalicious, virusMetadata }
}
