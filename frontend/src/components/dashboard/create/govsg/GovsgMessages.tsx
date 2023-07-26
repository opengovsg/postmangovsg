import { capitalize } from 'lodash'

import { useEffect, useState } from 'react'

import Moment from 'react-moment'

import overrideStylesTitleBar from '../../campaigns/OverrideTitleBar.module.scss'

import styles from './../../campaigns/Campaigns.module.scss'

import NoMatchDashboardImg from 'assets/img/no-match-dashboard.png'
import { Pagination, TitleBar } from 'components/common'

const ITEMS_PER_PAGE = 10

interface GovsgMessage {
  name: string
  mobile: string
  data: string
  passcode: string
  status: string
  sentAt: Date
  officer: string
}

export const GovsgMessages = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const singleRow = {
    name: 'Emily Yeo',
    mobile: '91234567',
    data: JSON.stringify({
      timeslot: '1-2pm',
      topic: 'PR application #1234',
    }),
    passcode: '8374',
    status: 'READ',
    sentAt: new Date(Date.parse('04 Dec 1995 00:12:00 GMT')),
    officer: 'James Tan',
  }
  const dummyData = Array(100).fill(singleRow)

  // TODO: Replace with actual data
  const [govsgMessagesDisplayed, setGovsgMessagesDisplayed] =
    useState(dummyData)
  const [selectedPage, setSelectedPage] = useState(0)
  const [hasFetchedGovsgMessages, setHasFetchedGovsgMessages] = useState(false)
  const [govsgMessageCount, setGovsgMessageCount] = useState(0)

  async function fetchGovsgMessages(selectedPage: number) {
    const options = {
      offset: selectedPage * ITEMS_PER_PAGE,
      limit: ITEMS_PER_PAGE,
    }
    // TODO: Replace with real API call
    // const { govsgMessages, totalCount } = await getGovsgMessages(options)
    // TODO: Fix mock pagination view
    const { govsgMessages, totalCount } = ((options) => {
      const { offset, limit } = options
      const govsgMessages = dummyData.slice(offset, limit)
      return {
        govsgMessages,
        totalCount: govsgMessages.length,
      }
    })(options)
    setGovsgMessageCount(totalCount)
    setGovsgMessagesDisplayed(govsgMessages)
    setSelectedPage(selectedPage)
    if (!hasFetchedGovsgMessages) setHasFetchedGovsgMessages(true)
  }

  //initial fetch to load page
  useEffect(() => {
    void fetchGovsgMessages(selectedPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPage])

  function handlePageChange(index: number) {
    void fetchGovsgMessages(index)
  }

  /* eslint-disable react/display-name */
  const columns = [
    {
      name: 'Recipient name'.toUpperCase(),
      render: (govsgMessage: GovsgMessage) => govsgMessage.name,
      width: 'xs',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          {name}
        </th>
      ),
    },
    {
      name: 'Recipient mobile'.toUpperCase(),
      render: (govsgMessage: GovsgMessage) => govsgMessage.mobile,
      width: 'xs',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          {name}
        </th>
      ),
    },
    {
      name: 'Message data'.toUpperCase(),
      render: (govsgMessage: GovsgMessage) => govsgMessage.data,
      width: 'md',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          {name}
        </th>
      ),
    },
    {
      name: 'Passcode'.toUpperCase(),
      render: (govsgMessage: GovsgMessage) => govsgMessage.passcode,
      width: 'xs',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          {name}
        </th>
      ),
    },
    {
      name: 'Status'.toUpperCase(),
      render: (govsgMessage: GovsgMessage) => capitalize(govsgMessage.status),
      width: 'xs',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          {name}
        </th>
      ),
    },
    {
      name: 'Sent'.toUpperCase(),
      render: (govsgMessage: GovsgMessage) =>
        govsgMessage.sentAt ? (
          <Moment format="MMM DD YYYY, HH:mm" interval={0}>
            {govsgMessage.sentAt}
          </Moment>
        ) : (
          <span></span>
        ),
      width: 'sm',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          {name}
        </th>
      ),
    },
    {
      name: 'Sent by'.toUpperCase(),
      render: (govsgMessage: GovsgMessage) => govsgMessage.officer,
      width: 'xs',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          {name}
        </th>
      ),
    },
  ]

  /* eslint-enable react/display-name */

  function renderRow(govsgMessage: GovsgMessage, key: number) {
    return (
      <tr key={key}>
        {columns.map(({ render, width }, key) => (
          <td className={width} key={key}>
            {render(govsgMessage)}
          </td>
        ))}
      </tr>
    )
  }

  function renderGovsgMessageList() {
    return (
      <>
        <tbody>{govsgMessagesDisplayed.map(renderRow)}</tbody>
      </>
    )
  }

  function renderNoMatch() {
    return (
      <div className={styles.content}>
        <div className={styles.emptyDashboard}>
          <img
            className={styles.image}
            src={NoMatchDashboardImg}
            alt="Empty dashboard graphic"
          />
          <h3>There are no messages.</h3>
        </div>
      </div>
    )
  }

  function renderPagination() {
    return (
      <>
        <Pagination
          itemsCount={govsgMessageCount}
          selectedPage={govsgMessageCount ? selectedPage : -1}
          setSelectedPage={handlePageChange}
          itemsPerPage={ITEMS_PER_PAGE}
        ></Pagination>
      </>
    )
  }

  function renderGovsgMessage() {
    return (
      <>
        <div className={styles.content}>
          <TitleBar
            title={govsgMessageCount + ' Messages'}
            overrideStyles={overrideStylesTitleBar}
          />
          <div className={styles.tableContainer}>
            <table className={styles.govsgMessageTable}>
              <thead>
                <tr>
                  {columns.map(({ name, width, renderHeader }, key) =>
                    renderHeader(name, width, key)
                  )}
                </tr>
              </thead>
              {govsgMessageCount > 0 ? renderGovsgMessageList() : <></>}
            </table>
          </div>
          {govsgMessageCount > 0 ? renderPagination() : renderNoMatch()}
        </div>
      </>
    )
  }

  return <>{renderGovsgMessage()}</>
}
