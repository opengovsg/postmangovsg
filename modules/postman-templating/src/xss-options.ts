import xss, { IFilterXSSOptions } from 'xss'
import { TemplateError } from './errors'

const URL =
  typeof window !== 'undefined' && window.URL ? window.URL : require('url').URL

const KEYWORD_REGEX = /^{{\s*?\w+\s*?}}$/

export const XSS_EMAIL_OPTION = {
  whiteList: {
    b: [],
    i: [],
    u: [],
    br: [],
    p: [],
    a: ['href', 'title', 'target'],
    img: ['src', 'alt', 'title', 'width', 'height'],
  },
  safeAttrValue: (tag: string, name: string, value: string): string => {
    // Note: value has already been auto-trimmed of whitespaces

    // Do not sanitize keyword when it's a href link, eg: <a href="{{protectedlink}}">link</a>
    if (tag === 'a' && name === 'href' && value.match(KEYWORD_REGEX)) {
      return value
    }

    // Do not sanitize keyword when it's a img src, eg: <img src="{{protectedImg}}">
    if (tag === 'img' && name === 'src' && value.match(KEYWORD_REGEX)) {
      return value
    }
    // The default safeAttrValue does guard against some edge cases
    // https://github.com/leizongmin/js-xss/blob/446f5daa3b65e9e8f0e9c71276cf61dad73d1ec3/dist/xss.js
    return xss.safeAttrValue(tag, name, value, xss.cssFilter)
  },
  stripIgnoreTag: true,
}

export const XSS_SMS_OPTION = {
  whiteList: { br: [] },
  stripIgnoreTag: true,
}

export const XSS_TELEGRAM_OPTION = {
  whiteList: {
    b: [],
    i: [],
    u: [],
    s: [],
    strike: [],
    del: [],
    p: [],
    code: ['class'],
    pre: [],
    a: ['href'],
  },
  safeAttrValue: (tag: string, name: string, value: string): string => {
    // Handle Telegram mention as xss-js does not recognize it as a valid url.
    if (tag === 'a' && name === 'href' && value.startsWith('tg://')) {
      return value
    }
    return xss.safeAttrValue(tag, name, value, xss.cssFilter)
  },
  stripIgnoreTag: true,
}

/**
 * Extend XSS options with image source filtering
 * @param baseOptions Options to be extended from
 * @param allowedImageSources Array of allowed image source hostnames
 */
export const filterImageSources = (
  baseOptions: IFilterXSSOptions,
  allowedImageSources: Array<string>
): IFilterXSSOptions => ({
  ...baseOptions,
  safeAttrValue: (tag: string, name: string, value: string): string => {
    // Check that the image source is from an allowed host
    if (allowedImageSources && tag === 'img' && name === 'src') {
      const hostname = new URL(value).hostname
      if (allowedImageSources.indexOf(hostname) < 0) {
        throw new TemplateError(
          `${hostname} is not a valid image host. Allowed image source(s): ${allowedImageSources.join(
            ', '
          )}`
        )
      }
    }

    const defaultSafeAttrValue = baseOptions?.safeAttrValue
      ? baseOptions.safeAttrValue
      : xss.safeAttrValue

    return defaultSafeAttrValue(tag, name, value, xss.cssFilter)
  },
})
