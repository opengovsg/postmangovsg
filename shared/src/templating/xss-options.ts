import {
  cssFilter,
  getDefaultCSSWhiteList,
  ICSSFilter,
  IFilterXSSOptions,
  safeAttrValue,
} from 'xss'

import { TemplateError } from './errors'

const URL =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  typeof window !== 'undefined' && window.URL ? window.URL : require('url').URL

const KEYWORD_REGEX = /^{{\s*?\w+\s*?}}$/

/**
 * Helper method to determine if a string is a HTTP URL
 * @param urlStr
 */
const isValidHttpUrl = (urlStr: string): boolean => {
  try {
    const url = new URL(urlStr)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (_) {
    return false
  }
}

const DEFAULT_EMAIL_ATTRS = ['style']
export const XSS_EMAIL_OPTION = {
  whiteList: {
    span: DEFAULT_EMAIL_ATTRS,
    b: DEFAULT_EMAIL_ATTRS,
    strong: DEFAULT_EMAIL_ATTRS,
    i: DEFAULT_EMAIL_ATTRS,
    em: DEFAULT_EMAIL_ATTRS,
    u: DEFAULT_EMAIL_ATTRS,
    ins: DEFAULT_EMAIL_ATTRS,
    br: DEFAULT_EMAIL_ATTRS,
    p: DEFAULT_EMAIL_ATTRS,
    ul: DEFAULT_EMAIL_ATTRS,
    ol: ['start', 'type', ...DEFAULT_EMAIL_ATTRS],
    li: DEFAULT_EMAIL_ATTRS,
    h1: DEFAULT_EMAIL_ATTRS,
    h2: DEFAULT_EMAIL_ATTRS,
    h3: DEFAULT_EMAIL_ATTRS,
    h4: DEFAULT_EMAIL_ATTRS,
    h5: DEFAULT_EMAIL_ATTRS,
    h6: DEFAULT_EMAIL_ATTRS,
    a: ['href', 'title', 'target', ...DEFAULT_EMAIL_ATTRS],
    img: [
      'src',
      'alt',
      'title',
      'width',
      'height',
      'data-link',
      ...DEFAULT_EMAIL_ATTRS,
    ],
    div: [],
    tbody: [],
    table: DEFAULT_EMAIL_ATTRS,
    tr: DEFAULT_EMAIL_ATTRS,
    td: ['colspan', 'rowspan', ...DEFAULT_EMAIL_ATTRS],
    th: DEFAULT_EMAIL_ATTRS,
    sup: DEFAULT_EMAIL_ATTRS,
    caption: DEFAULT_EMAIL_ATTRS,
  },
  safeAttrValue: (
    tag: string,
    name: string,
    value: string,
    cssFilter: ICSSFilter
  ): string => {
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
    return safeAttrValue(tag, name, value, cssFilter)
  },
  stripIgnoreTag: true,
  // Allow CSS style attributes filtering
  // https://github.com/leizongmin/js-xss#customize-css-filter
  css: {
    whiteList: {
      ...getDefaultCSSWhiteList(),
      'white-space': true,
    },
  },
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
  safeAttrValue: (
    tag: string,
    name: string,
    value: string,
    cssFilter: ICSSFilter
  ): string => {
    // Handle Telegram mention as xss-js does not recognize it as a valid url.
    if (
      tag === 'a' &&
      name === 'href' &&
      (value.startsWith('tg://') || value.match(KEYWORD_REGEX))
    ) {
      return value
    }
    return safeAttrValue(tag, name, value, cssFilter)
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
    // Check that the image source is from an allowed host only if it is an URL (to account for variable value).
    if (tag === 'img' && name === 'src' && isValidHttpUrl(value)) {
      const hostname = new URL(value).hostname
      if (allowedImageSources.indexOf(hostname) < 0) {
        throw new TemplateError(
          `${hostname} is not a valid image source. Allowed image source(s): ${allowedImageSources.join(
            ', '
          )}`
        )
      }
    }

    const defaultSafeAttrValue = baseOptions?.safeAttrValue
      ? baseOptions.safeAttrValue
      : safeAttrValue

    return defaultSafeAttrValue(tag, name, value, cssFilter)
  },
})
