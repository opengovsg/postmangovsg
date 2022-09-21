import { Dispatch, SetStateAction } from 'react'

import { List } from 'classes'
import { Dropdown } from 'components/common'

const ManagedListSection = ({
  managedLists,
  setSelectedListId,
}: {
  managedLists: List[]
  setSelectedListId: Dispatch<SetStateAction<number | undefined>>
}) => {
  return (
    <>
      <h3>Choose recipient list</h3>
      <p>
        Reuse an existing list for your campaign.{' '}
        <a
          href="https://go.gov.sg/postman-list"
          target="_blank"
          rel="noreferrer"
        >
          <u>Learn more.</u>
        </a>
      </p>

      <Dropdown
        disabled={!managedLists.length}
        options={managedLists.map((list) => {
          return {
            label: list.name,
            value: list.id.toString(),
          }
        })}
        onSelect={(value) => setSelectedListId(+value)}
        defaultLabel="Select existing recipient list"
        aria-label="Managed list selector"
      />
    </>
  )
}

export default ManagedListSection
