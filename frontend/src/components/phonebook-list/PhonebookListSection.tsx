import { Dispatch, SetStateAction } from 'react'

import { OutboundLink } from 'react-ga'

import { Dropdown, InfoBlock, StepSection, TextButton } from 'components/common'
import StepHeader from 'components/common/step-header'

export const PhonebookListSection = ({
  phonebookLists,
  setSelectedPhonebookListId,
  retrieveAndPopulatePhonebookLists,
  isProcessing,
  defaultLabel,
}: {
  phonebookLists: { label: string; value: string }[]
  setSelectedPhonebookListId: Dispatch<SetStateAction<number | undefined>>
  retrieveAndPopulatePhonebookLists: () => void
  isProcessing: boolean
  defaultLabel: string
}) => {
  return (
    <StepSection>
      <StepHeader title={'Phonebook Contact List'} />
      <p>
        Phonebook allows you to manage your contact lists and send messages via
        Postman. &nbsp;
        <b>New to Phonebook?</b> &nbsp; Log in &nbsp;
        <OutboundLink
          eventLabel={'https://phonebook.postman.gov.sg/agency'}
          to={'https://phonebook.postman.gov.sg/agency'}
          target="_blank"
        >
          here
        </OutboundLink>
        &nbsp; to try.
      </p>
      <Dropdown
        onSelect={(selected) => setSelectedPhonebookListId(+selected)}
        disabled={!phonebookLists.length || isProcessing}
        options={phonebookLists}
        aria-label="Phonebook list selector"
        defaultLabel={defaultLabel}
      ></Dropdown>
      <InfoBlock>
        <p>
          All your contact lists on Phonebook should be listed. &nbsp;
          <TextButton onClick={retrieveAndPopulatePhonebookLists}>
            Click here to refresh
          </TextButton>{' '}
          &nbsp; if it does not appear above.
        </p>
        <p>
          Note: If your recipient unsubscribe from your Phonebook list, they
          will automatically be removed from your list.
        </p>
      </InfoBlock>
    </StepSection>
  )
}
