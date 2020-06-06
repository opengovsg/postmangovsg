import TemplateClient from './template-client'
import xss from 'xss'

export default function (opt: xss.IFilterXSSOptions | undefined) {
  return new TemplateClient(opt)
}