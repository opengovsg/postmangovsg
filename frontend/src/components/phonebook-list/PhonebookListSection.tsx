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
}: {
  phonebookLists: { label: string; value: string }[]
  setSelectedPhonebookListId: Dispatch<SetStateAction<number | undefined>>
  retrieveAndPopulatePhonebookLists: () => void
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
        onSelect={(selected) => {
          setSelectedPhonebookListId(+selected)
        }}
        options={phonebookLists}
        // this or the saved contact list
        defaultLabel={phonebookLists[0]?.label}
        aria-label="Phonebook list"
      ></Dropdown>
      <InfoBlock>
        <p>
          If your Phonebook contact list is not listed,{' '}
          <TextButton onClick={retrieveAndPopulatePhonebookLists}>
            click here to refresh.
          </TextButton>
        </p>
        <p>
          New to Phonebook? Log in{' '}
          <OutboundLink
            eventLabel={'https://phonebook.gov.sg'}
            to={'https://phonebook.gov.sg'}
            target="_blank"
          >
            here
          </OutboundLink>{' '}
          to start managing your contacts and allow your recipients to update
          their contact details through Postman’s Public Phonebook Portal.
        </p>
      </InfoBlock>
    </StepSection>
  )
}
