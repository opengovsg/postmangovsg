import express from 'express'
import helmet from 'helmet'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

const securityHeadersLoader = ({ app }: { app: express.Application }): void => {
  app.use(helmet.xssFilter())
  app.use(helmet.hidePoweredBy())
  app.use(helmet.dnsPrefetchControl()) // Sets "X-DNS-Prefetch-Control: off".
  app.use(helmet.frameguard({ action: 'deny' })) // Don't think we will be put in an iframe
  app.use(helmet.noSniff())
  app.use(helmet.ieNoOpen())

  const hstsMiddleware = helmet.hsts({ maxAge: 5184000 }) // 60 days

  // We should not add this header in if the request is sent over HTTP
  // Attacker could maliciously strip or inject this header into response
  app.use((req, res, next) => {
    if (req.secure) {
      hstsMiddleware(req, res, next)
    } else next()
  })

  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'"],
        fontSrc: ["'none'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
      },
    })
  )

  app.use(helmet.referrerPolicy({ policy: 'same-origin' }))

  app.use(
    helmet.featurePolicy({
      features: {
        fullscreen: ["'self'"],
        vibrate: ["'none'"],
        payment: ["'none'"],
        syncXhr: ["'none'"],
        accelerometer: ["'none'"],
        ambientLightSensor: ["'none'"],
        autoplay: ["'none'"],
        camera: ["'none'"],
        documentDomain: ["'none'"],
        documentWrite: ["'none'"],
        encryptedMedia: ["'none'"],
        fontDisplayLateSwap: ["'none'"],
        geolocation: ["'none'"],
        gyroscope: ["'none'"],
        layoutAnimations: ["'none'"],
        legacyImageFormats: ["'none'"],
        loadingFrameDefaultEager: ["'none'"],
        magnetometer: ["'none'"],
        microphone: ["'none'"],
        midi: ["'none'"],
        oversizedImages: ["'none'"],
        pictureInPicture: ["'none'"],
        serial: ["'none'"],
        speaker: ["'none'"],
        syncScript: ["'none'"],
        unoptimizedLosslessImages: ["'none'"],
        unoptimizedLossyImages: ["'none'"],
        unsizedMedia: ["'none'"],
        usb: ["'none'"],
        verticalScroll: ["'none'"],
        vr: ["'none'"],
        wakeLock: ["'none'"],
        xr: ["'none'"],
      },
    })
  )
  logger.info({ message: 'CSP headers loaded' })
}

export default securityHeadersLoader
