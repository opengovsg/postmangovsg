import { Selector } from 'testcafe'
import { ReactSelector } from 'testcafe-react-selectors'
import config from './../config'

export const nextButton = Selector(
  ReactSelector('PrimaryButton').withText('Next').withProps({
    disabled: false,
  }),
  { timeout: config.get('timeout.next') }
)

export const recipientUpload = ReactSelector('CsvUpload FileInput')
  .child('input')
  .withAttribute('type', 'file')
