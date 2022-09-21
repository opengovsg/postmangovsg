import { Dropdown } from 'components/common'

const ManagedListSection = () => {
  return (
    <>
      <h3>Choose recipient list</h3>
      <p>
        Reuse an existing list for your future campaigns.{' '}
        <a
          href="https://go.gov.sg/postman-list"
          target="_blank"
          rel="noreferrer"
        >
          <u>Learn more.</u>
        </a>
      </p>

      <Dropdown
        disabled={true}
        options={[]} // TODO: Actually implement the managed list dropdown selector
        onSelect={() => null} // TODO: Actually implement the managed list dropdown selector
        defaultLabel="Select existing recipient list"
        aria-label="Managed list selector"
      />
    </>
  )
}

export default ManagedListSection
