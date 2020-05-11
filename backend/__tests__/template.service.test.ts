import { template } from '@core/services/template.service'
import { TemplateError } from '@core/errors'

describe('template', () => {
  describe('basic', () => {
    test('no params', () => {
      const params = {}
      const body = 'Hello world'
      expect(template(body, params)).toEqual('Hello world')
    })
  
    test('has params', () => {
      const params = { 'name' : 'test' }
      const body = 'Hello {{name}}'
      expect(template(body, params)).toEqual('Hello test')
    })

    test('missing params', () => {
      const params = {}
      const body = 'Hello {{name}}'
      expect(() => {template(body, params)}).toThrow(TemplateError)
    })
  })
  
  describe('parsing errors', () => {
    const table = [
      [ 'unclosed curly braces', 'Hello {{'],
      [ 'empty variable', '{{}}'],
      [ 'special character', '{{^^}}'],
      [ 'single quote', "{{'}}"],
      ['should not allow strings in variables', "{{'hello'}}"]
    ]

    test.each(table)(
      '%s : %s', (_, body) => {
        expect(() => {template(body, {})}).toThrow(TemplateError)
      }
    )
  })

  // Squirrelly adds a backslash infront of some special characters
  // This test suite is to ensure that the backslash is removed
  describe('no backslash infront of special characters', () => {
    const table = [
      [ 'Single quote', '\'' ],
      [ 'Backslash', '\\' ],
    ]

    test.each(table)(
      '%s', (_, body) => {
        expect(template(body, {})).toEqual(body)
      }
    )
  })
})