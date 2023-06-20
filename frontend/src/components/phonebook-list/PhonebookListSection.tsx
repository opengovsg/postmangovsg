import { Dispatch, SetStateAction } from 'react'

import { OutboundLink } from 'react-ga'

import {
  Dropdown,
  InfoBlock,
  StepHeader,
  StepSection,
  TextButton,
} from 'components/common'

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
      <StepHeader title="Select Phonebook contact list" subtitle="Step 2">
        <p>
          All your saved contact lists in Phonebook will automatically appear
          here.
        </p>
      </StepHeader>
      <Dropdown
        onSelect={(selected) => setSelectedPhonebookListId(+selected)}
        disabled={!phonebookLists.length || isProcessing}
        options={phonebookLists}
        aria-label="Phonebook list selector"
        defaultLabel={defaultLabel}
      ></Dropdown>
      <InfoBlock>
        <p>
          If your Phonebook contact list is not listed, &nbsp;
          <TextButton onClick={retrieveAndPopulatePhonebookLists}>
            click here to refresh.
          </TextButton>
        </p>
        <p>
          New to Phonebook? Log in &nbsp;
          <OutboundLink
            eventLabel={'https://phonebook.postman.gov.sg/agency'}
            to={'https://phonebook.postman.gov.sg/agency'}
            target="_blank"
          >
            here
          </OutboundLink>
          &nbsp; to start managing your contacts and allow your recipients to
          update their contact details through Postman’s Public Phonebook
          Portal.
        </p>
      </InfoBlock>
    </StepSection>
  )
}
