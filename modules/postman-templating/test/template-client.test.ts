import { TemplateClient } from '../src/template-client'
import { TemplateError } from '../src/errors'
import xss from 'xss'

describe('template', () => {
  let templateClient: TemplateClient
  beforeAll(() => {
    templateClient = new TemplateClient()
  })
  describe('basic', () => {
    test('no params', () => {
      const params = {}
      const body = 'Hello world'
      expect(templateClient.template(body, params)).toEqual('Hello world')
    })

    test('has params', () => {
      const params = { name: 'test' }
      const body = 'Hello {{name}}'
      expect(templateClient.template(body, params)).toEqual('Hello test')
    })

    test('missing params should be replaced with empty string', () => {
      const params = {}
      const body = 'Hello {{name}}'
      expect(templateClient.template(body, params)).toEqual('Hello ')
    })
  })

  describe('parsing errors', () => {
    const table = [
      ['unclosed curly braces', 'Hello {{'],
      ['empty variable', '{{}}'],
      ['special character', '{{^^}}'],
      ['single quote', "{{'}}"],
      ['should not allow strings in variables', "{{'hello'}}"],
    ]

    test.each(table)('%s : %s', (_, body) => {
      expect(() => {
        templateClient.template(body, {})
      }).toThrow(TemplateError)
    })
  })

  // Squirrelly adds a backslash infront of some special characters
  // This test suite is to ensure that the backslash is removed
  describe('no backslash infront of special characters', () => {
    const table = [
      ['Single quote', "'"],
      ['Backslash', '\\'],
      ['Line break', '\n'],
    ]

    test.each(table)('%s', (_, body) => {
      expect(templateClient.template(body, {})).toEqual(body)
    })
  })

  describe('xss', () => {
    describe('email', () => {
      const xssOptions = {
        whiteList: {
          b: [],
          i: [],
          u: [],
          br: [],
          p: [],
          a: ['href', 'title', 'target'],
          img: ['src', 'alt', 'title', 'width', 'height'],
        },
        stripIgnoreTag: true,
      }
      const client: TemplateClient = new TemplateClient(xssOptions)

      test('email template should allow b, i, u, br, a, img tags', () => {
        const body =
          'XSS Test<b>bold</b><u>underline</u><i>italic</i>' +
          '<img src="https://postman.gov.sg/static/media/ogp-logo.7ea2980a.svg"></img>' +
          '<a href="https://open.gov.sg">Open.gov.sg</a>'

        expect(client.template(body, {})).toEqual(body)
      })
      test('email template should not allow any other html tags', () => {
        const script = "<script>alert('xss!')</script>"
        const body =
          'XSS Test<b>bold</b><u>underline</u><i>italic</i>' +
          '<img src="https://postman.gov.sg/static/media/ogp-logo.7ea2980a.svg"></img>' +
          '<a href="https://open.gov.sg">Open.gov.sg</a>'
        const strippedScript = "alert('xss!')"

        expect(client.template(script + body, {})).toEqual(
          strippedScript + body
        )
      })
      test('email template should also strip params of tags', () => {
        const params = { xss: "<script>alert('xss!')</script>", text: 'hello' }
        const body = 'test {{xss}} {{text}}'
        const output = "test alert('xss!') hello"
        expect(client.template(body, params)).toEqual(output)
      })
    })
    describe('sms', () => {
      const xssOptions = {
        whiteList: { br: [] },
        stripIgnoreTag: true,
      }
      const client: TemplateClient = new TemplateClient(xssOptions)

      test('sms template should not allow any html tags except br', () => {
        const body =
          'XSS Test<b>bold</b><u>underline</u><i>italic</i>' +
          '<img src="https://postman.gov.sg/static/media/ogp-logo.7ea2980a.svg"></img>' +
          '<a href="https://open.gov.sg">Open.gov.sg</a>'
        const output = 'XSS Testboldunderlineitalic' + 'Open.gov.sg'

        expect(client.template(body, {})).toEqual(output)
      })
      test('sms template should also strip params of tags', () => {
        const params = { xss: "<script>alert('xss!')</script>", text: 'hello' }
        const body = 'test {{xss}} {{text}}'
        const output = "test alert('xss!') hello"

        expect(client.template(body, params)).toEqual(output)
      })
    })
    describe('telegram', () => {
      const xssOptions = {
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

      const client: TemplateClient = new TemplateClient(xssOptions, '\n')
      test('Telegram should support b i u s strike del p code pre a', () => {
        const body = 
          '<b>bold</b>' +
          '<i>italic</i>' +
          '<u>underline</u>' +
          '<s>strike</s> <strike>strike</strike> <del>strike</del>' +
          '<a href="https://open.gov.sg">OGP</a>' +
          '<pre>pre-formatted</pre>' +
          '<code class="language-python">print("hello world")</code>'

        expect(client.template(body, {})).toEqual(body)
      })
      test('inline mention links should be supported', () => {
        const body = '<a href="tg://user?id=837238105">me</a>'
        expect(client.template(body, {})).toEqual(body)
      })
      test('line breaks should be preserved', () => {
        const body = 'hello\nhello'
        expect(client.template(body, {})).toEqual(body)
      })
      test('unsupported HTML tags should be stripped', () => {
        const body = '<div>hello</div><span>world</span>'
        const output = 'helloworld'
        expect(client.template(body, {})).toEqual(output)
      })
      test('unsupported HTML tag attrs should be stripped', () => {
        const body = '<a href="https://open.gov.sg" target="_blank">OGP</a>'
        const output = '<a href="https://open.gov.sg">OGP</a>'
        expect(client.template(body, {})).toEqual(output)
      })
      test('Telegram template should strip params of tags', () => {
        const params = { xss: "<script>alert('xss!')</script>", text: 'hello' }
        const body = 'test {{xss}} {{text}}'
        const output = "test alert('xss!') hello"
        expect(client.template(body, params)).toEqual(output)
      })
    })
  })
})
