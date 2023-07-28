import axios from 'axios'

import { capitalize } from 'lodash'

import { useEffect, useState } from 'react'

import Moment from 'react-moment'

import overrideStylesTitleBar from '../../campaigns/OverrideTitleBar.module.scss'

import styles from './../../campaigns/Campaigns.module.scss'

import NoMatchDashboardImg from 'assets/img/no-match-dashboard.png'
import { Campaign } from 'classes'
import { Pagination, TitleBar } from 'components/common'

const ITEMS_PER_PAGE = 10

interface GovsgMessage {
  name: string
  mobile: string
  data: string
  passcode: string
  status: string
  sent: Date
  officer: string
}

interface GovsgMessagesProps {
  campaignId: Campaign['id']
}

export const GovsgMessages = ({ campaignId }: GovsgMessagesProps) => {
  const [govsgMessagesDisplayed, setGovsgMessagesDisplayed] = useState([])
  const [selectedPage, setSelectedPage] = useState(0)
  const [hasFetchedGovsgMessages, setHasFetchedGovsgMessages] = useState(false)
  const [govsgMessageCount, setGovsgMessageCount] = useState(0)

  const fetchGovsgMessages = async (selectedPage: number) => {
    const options = {
      offset: selectedPage * ITEMS_PER_PAGE,
      limit: ITEMS_PER_PAGE,
    }
    const response = await axios.get(`/campaign/${campaignId}/govsg/messages`, {
      params: {
        ...options,
      },
    })
    const { messages: govsgMessages, total_count: totalCount } = response.data
    setGovsgMessageCount(totalCount)
    setGovsgMessagesDisplayed(govsgMessages)
    setSelectedPage(selectedPage)
    if (!hasFetchedGovsgMessages) setHasFetchedGovsgMessages(true)
  }

  useEffect(() => {
    void fetchGovsgMessages(selectedPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPage])

  const handlePageChange = (index: number) => {
    void fetchGovsgMessages(index)
  }

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
        govsgMessage.sent ? (
          <Moment format="MMM DD YYYY, HH:mm" interval={0}>
            {govsgMessage.sent}
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

  const renderRow = (govsgMessage: GovsgMessage, key: number) => {
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

  const renderGovsgMessageList = () => {
    return <tbody>{govsgMessagesDisplayed.map(renderRow)}</tbody>
  }

  const renderNoMatch = () => {
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

  const renderPagination = () => {
    return (
      <Pagination
        itemsCount={govsgMessageCount}
        selectedPage={govsgMessageCount ? selectedPage : -1}
        setSelectedPage={handlePageChange}
        itemsPerPage={ITEMS_PER_PAGE}
      ></Pagination>
    )
  }

  const renderGovsgMessage = () => {
    return (
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
    )
  }

  return renderGovsgMessage()
}
