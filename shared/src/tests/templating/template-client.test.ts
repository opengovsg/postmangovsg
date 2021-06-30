import { TemplateClient, TemplateError } from '../../templating'

import {
  XSS_EMAIL_OPTION,
  XSS_SMS_OPTION,
  XSS_TELEGRAM_OPTION,
  filterImageSources,
} from '../../templating/xss-options'

describe('template', () => {
  let templateClient: TemplateClient
  beforeAll(() => {
    templateClient = new TemplateClient({})
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

    test('supports underscore in keyword', () => {
      const params = { postal_cd: '123456' }
      const body = 'Your postal code: {{postal_cd}}'
      expect(templateClient.template(body, params)).toEqual(
        'Your postal code: 123456'
      )
    })
  })

  describe('parsing errors', () => {
    const table = [
      ['unclosed curly braces', 'Hello {{'],
      ['empty variable', '{{}}'],
      ['special character: ^', '{{^^}}'],
      ['special character: &', '{{&ampersand}}'],
      ['special character: #', '{{#hash}}this should also be hidden{{/hash}}'],
      ['special character: !', '{{!var}}'],
      ['special character: >', '{{>var}}'],
      ['nested variables', '{{nested.var}}'],
      ['triple braces', '{{{triple_braces}}}'],
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

  /**
   * Templating Config
   */
  describe('Templating config', () => {
    describe('removeEmptyLines', () => {
      const body = 'hello\n\n\n123'
      test('emptys lines should not be removed', () => {
        const expected = 'hello<br /><br /><br />123'
        expect(
          templateClient.template(body, {}, { replaceNewLines: true })
        ).toEqual(expected)
      })
      test('emptys lines should be removed', () => {
        const expected = 'hello<br />123'
        expect(
          templateClient.template(
            body,
            {},
            { replaceNewLines: true, removeEmptyLines: true }
          )
        ).toEqual(expected)
      })
      test('empty lines with empty tags should be removed', () => {
        const template = '<b></b>\n<b></b>\n'
        const expected = '<br />'

        expect(
          templateClient.template(
            template,
            {},
            { replaceNewLines: true, removeEmptyLines: true }
          )
        ).toEqual(expected)
      })
      test('empty lines with nested empty tags should be removed', () => {
        const template = '<b><i></i></b>\n<b></b>\n'
        const expected = '<br />'

        expect(
          templateClient.template(
            template,
            {},
            { replaceNewLines: true, removeEmptyLines: true }
          )
        ).toEqual(expected)
      })
      test('empty lines with tags containing only spaces should be removed', () => {
        const template = '<b>\t\t</b>\n<b> </b>\n<b>\f</b>'
        const expected = '<br />'

        expect(
          templateClient.template(
            template,
            {},
            { replaceNewLines: true, removeEmptyLines: true }
          )
        ).toEqual(expected)
      })
      test('empty lines with empty img, hr and br tags should not be removed', () => {
        const template =
          '<br/><hr/>' +
          '<img src="https://postman.gov.sg/static/media/ogp-logo.7ea2980a.svg"/>'

        expect(
          templateClient.template(
            template,
            {},
            { replaceNewLines: true, removeEmptyLines: true }
          )
        ).toEqual(template)
      })
    })
    describe('removeEmptyLinesFromTables', () => {
      const body = `<table>\n<tr>\n<th>Firstname</th>\n</tr>\n\n</table>`
      test('emptys lines from tables should not be removed', () => {
        const expected =
          '<table><br /><tr><br /><th>Firstname</th><br /></tr><br /><br /></table>'
        expect(
          templateClient.template(body, {}, { replaceNewLines: true })
        ).toEqual(expected)
      })
      test('emptys lines from tables should be removed', () => {
        const expected = '<table><tr><th>Firstname</th></tr></table>'
        expect(
          templateClient.template(
            body,
            {},
            { replaceNewLines: true, removeEmptyLinesFromTables: true }
          )
        ).toEqual(expected)
      })
    })
  })

  describe('parseTemplate variables', () => {
    test('variables should be unique, lowercased and returned in order of appearance', () => {
      const body = '{{ blah }} {{chip}}{{ BLAH}} {{chip}} {{F1sh}}'
      const expected = ['blah', 'chip', 'f1sh']
      expect(templateClient.parseTemplate(body).variables).toEqual(expected)
    })

    test('variables should return an empty array if no keywords', () => {
      const body = 'fishpaste is good'
      const expected: string[] = []
      expect(templateClient.parseTemplate(body).variables).toEqual(expected)
    })
  })

  describe('xss', () => {
    describe('email', () => {
      const client: TemplateClient = new TemplateClient({
        xssOptions: XSS_EMAIL_OPTION,
      })

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
      const client: TemplateClient = new TemplateClient({
        xssOptions: XSS_SMS_OPTION,
      })

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
      const client: TemplateClient = new TemplateClient({
        xssOptions: XSS_TELEGRAM_OPTION,
        lineBreak: '\n',
      })
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

describe('replaceNewLinesAndSanitize', () => {
  describe('email', () => {
    const client: TemplateClient = new TemplateClient({
      xssOptions: XSS_EMAIL_OPTION,
    })

    test('Should not sanitize keyword in a href', () => {
      const body = '<a href="{{protectedlink}}">link</a>'
      expect(client.replaceNewLinesAndSanitize(body)).toEqual(body)
    })

    test('Should strip if href contains keyword with prohibited values', () => {
      const body = '<a href="fakemailto:{{recipient}}">link</a>'
      const expected = '<a href>link</a>'
      expect(client.replaceNewLinesAndSanitize(body)).toEqual(expected)
    })

    test('Should not sanitize keyword in a img src', () => {
      const body = '<img src="{{protectedimage}}">'
      expect(client.replaceNewLinesAndSanitize(body)).toEqual(body)
    })
  })

  describe('telegram', () => {
    const client: TemplateClient = new TemplateClient({
      xssOptions: XSS_TELEGRAM_OPTION,
    })

    test('Should not sanitize tg:// telegram links', () => {
      const body = '<a href="tg://join?invite=">link</a>'
      expect(client.replaceNewLinesAndSanitize(body)).toEqual(body)
    })

    test('Should not sanitize keyword in a href', () => {
      const body = '<a href="{{link}}">link</a>'
      expect(client.replaceNewLinesAndSanitize(body)).toEqual(body)
    })
  })
})

describe('filterXSS', () => {
  const xssOptions = filterImageSources({}, ['valid.com', 'valid2.com'])
  const templateClient: TemplateClient = new TemplateClient({ xssOptions })

  test('should not throw an error if image source is valid', () => {
    const body = '<img src="https://valid.com/image.jpg" />'
    expect(() => {
      templateClient.template(body, {})
    }).not.toThrow()
  })

  test('should throw an error if image source is not valid', () => {
    const body = '<img src="https://invalid.com/image.jpg" />'
    expect(() => {
      templateClient.template(body, {})
    }).toThrow(TemplateError)
  })
})
