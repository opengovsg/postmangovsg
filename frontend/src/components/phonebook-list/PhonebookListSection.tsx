import { OutboundLink } from 'react-ga'

import { Dropdown, InfoBlock, StepSection, TextButton } from 'components/common'
import { isPhonebookAutoUnsubscribeEnabled } from 'services/phonebook.service'

export const PhonebookListSection = ({
  phonebookLists,
  onPhonebookListSelected,
  retrieveAndPopulatePhonebookLists,
  isProcessing,
  defaultLabel,
}: {
  phonebookLists: { label: string; value: string }[]
  onPhonebookListSelected: (listId: number) => void
  retrieveAndPopulatePhonebookLists: () => void
  isProcessing: boolean
  defaultLabel: string
}) => {
  return (
    <StepSection>
      <h4>Phonebook Contact List</h4>
      <p>
        Phonebook allows you to manage your contact lists and send messages via
        Postman. &nbsp;
        <b>New to Phonebook?</b> &nbsp; Log in &nbsp;
        <OutboundLink
          eventLabel={'https://phonebook.gov.sg/agency'}
          to={'https://phonebook.gov.sg/agency'}
          target="_blank"
        >
          here
        </OutboundLink>
        &nbsp; to try.
      </p>
      <Dropdown
        onSelect={(selected) => onPhonebookListSelected(+selected)}
        disabled={!phonebookLists.length || isProcessing}
        options={phonebookLists}
        aria-label="Phonebook list selector"
        defaultLabel={defaultLabel}
        skipOnSelectForDefaultLabel={true}
      ></Dropdown>
      <InfoBlock>
        <p>
          All your contact lists on Phonebook should be listed. &nbsp;
          <TextButton onClick={retrieveAndPopulatePhonebookLists}>
            Click here to refresh
          </TextButton>
          &nbsp; if it does not appear above. Manual uploading of csv will
          override the Phonebook contact list above.
        </p>
        {isPhonebookAutoUnsubscribeEnabled() && (
          <p>
            <strong>Note:</strong> If your recipient unsubscribe from your
            Phonebook list, they will automatically be removed from your list.
          </p>
        )}
      </InfoBlock>
    </StepSection>
  )
}
