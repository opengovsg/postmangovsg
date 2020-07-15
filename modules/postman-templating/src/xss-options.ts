import xss from 'xss'
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
    const keywordRegex = /{{\s*?\w+\s*?}}/g
    // Do not sanitize keyword when it's a href link, eg: <a href="{{protectedlink}}">link</a>
    if (tag === 'a' && name === 'href' && value.match(keywordRegex)) {
      return value
    }

    // Do not sanitize keyword when it's a img src, eg: <img src="{{protectedImg}}">
    if (tag === 'img' && name === 'src' && value.match(keywordRegex)) {
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
  safeAttrValue: (
    tag: string,
    name: string,
    value: string
  ): string => {
    // Handle Telegram mention as xss-js does not recognize it as a valid url.
    if (tag === 'a' && name === 'href' && value.startsWith('tg://')) {
      return value
    }
    return xss.safeAttrValue(tag, name, value, xss.cssFilter)
  },
  stripIgnoreTag: true,
}