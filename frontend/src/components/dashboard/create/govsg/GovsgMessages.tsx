import axios from 'axios'

import { useContext, useEffect, useState } from 'react'

import Moment from 'react-moment'

import overrideStylesTitleBar from '../../campaigns/OverrideTitleBar.module.scss'

import styles from './GovsgMessages.module.scss'

import NoMatchDashboardImg from 'assets/img/no-match-dashboard.png'

import { Campaign } from 'classes'
import { ConfirmModal, Pagination, TitleBar } from 'components/common'
import { StatusIconText } from 'components/common/StatusIconText/StatusIconText'

import { PasscodeBadge } from 'components/common/StyledText/PasscodeBadge'
import { PrettyJson } from 'components/common/StyledText/PrettyJson'
import { ResendButton } from 'components/common/action-button/ResendButton'
import { ModalContext } from 'contexts/modal.context'

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
  const [govsgMessageCount, setGovsgMessageCount] = useState(0)
  const modalContext = useContext(ModalContext)

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
  }

  const onModalConfirm = (govsgMessage: GovsgMessage) => {
    // TODO: Call resend endpoint
    console.log(govsgMessage)
  }

  const openModal = (govsgMessage: GovsgMessage) => {
    modalContext.setModalContent(
      <ConfirmModal
        title={`Resend message to ${govsgMessage.name} (${govsgMessage.mobile})?`}
        subtitle="Resending is irreversible."
        buttonText="Confirm resend now"
        buttonIcon="bx-send"
        onConfirm={() => onModalConfirm(govsgMessage)}
      />
    )
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
      name: 'RECIPIENT NAME',
      render: (govsgMessage: GovsgMessage) => govsgMessage.name,
      width: 'xs',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          {name}
        </th>
      ),
    },
    {
      name: 'RECIPIENT MOBILE',
      render: (govsgMessage: GovsgMessage) => govsgMessage.mobile,
      width: 'xs',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          {name}
        </th>
      ),
    },
    {
      name: 'MESSAGE DATA',
      render: (govsgMessage: GovsgMessage) => {
        const json = JSON.parse(govsgMessage.data)
        return <PrettyJson json={json} />
      },
      width: 'md',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          {name}
        </th>
      ),
    },
    {
      name: 'PASSCODE',
      render: (govsgMessage: GovsgMessage) => {
        return (
          <PasscodeBadge
            label={govsgMessage.passcode}
            placeholder="Not created yet"
          />
        )
      },
      width: 'xs',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          {name}
        </th>
      ),
    },
    {
      name: 'STATUS',
      render: (govsgMessage: GovsgMessage) => {
        return <StatusIconText label={govsgMessage.status} />
      },
      width: 'xs',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          {name}
        </th>
      ),
    },
    {
      name: 'SENT',
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
      name: 'SENT BY',
      render: (govsgMessage: GovsgMessage) => govsgMessage.officer,
      width: 'xs',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          {name}
        </th>
      ),
    },
    {
      name: 'ACTION',
      render: (govsgMessage: GovsgMessage) => {
        return <ResendButton onClick={() => openModal(govsgMessage)} />
      },
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
