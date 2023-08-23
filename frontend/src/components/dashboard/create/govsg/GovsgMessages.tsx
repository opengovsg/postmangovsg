import axios from 'axios'

import cx from 'classnames'
import { debounce } from 'lodash'
import { useCallback, useContext, useEffect, useState } from 'react'

import Moment from 'react-moment'

import overrideStylesTextInput from '../../campaigns/OverrideTextInput.module.scss'
import overrideStylesTitleBar from '../../campaigns/OverrideTitleBar.module.scss'

import styles from './GovsgMessages.module.scss'

import NoMatchDashboardImg from 'assets/img/no-match-dashboard.png'

import { Campaign } from 'classes'
import {
  ConfirmModal,
  Pagination,
  TextInput,
  TitleBar,
} from 'components/common'
import { LoadingSpinner } from 'components/common/LoadingSpinner/LoadingSpinner'
import { StatusIconText } from 'components/common/StatusIconText/StatusIconText'

import { PasscodeBadge } from 'components/common/StyledText/PasscodeBadge'
import { PrettyJson } from 'components/common/StyledText/PrettyJson'
import { ResendButton } from 'components/common/action-button/ResendButton'
import { ModalContext } from 'contexts/modal.context'

const ITEMS_PER_PAGE = 10

interface GovsgMessage {
  id: string
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
  const [govsgMessageCount, setGovsgMessageCount] = useState(0)
  const [govsgMessagesDisplayed, setGovsgMessagesDisplayed] = useState<
    GovsgMessage[]
  >([])
  const [search, setSearch] = useState('')
  const [selectedPage, setSelectedPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [shouldHavePasscode, setShouldHavePasscode] = useState(false)
  const modalContext = useContext(ModalContext)

  const fetchGovsgMessages = async (search: string, selectedPage: number) => {
    const searchOptions = search ? { search } : {}
    const options = {
      offset: selectedPage * ITEMS_PER_PAGE,
      limit: ITEMS_PER_PAGE,
      ...searchOptions,
    }
    const response = await axios.get(`/campaign/${campaignId}/govsg/messages`, {
      params: {
        ...options,
      },
    })
    const {
      messages: govsgMessages,
      total_count: totalCount,
      has_passcode: hasPasscode,
    } = response.data
    setGovsgMessageCount(totalCount)
    setGovsgMessagesDisplayed(govsgMessages)
    setSelectedPage(selectedPage)
    setShouldHavePasscode(hasPasscode)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const searchGovsgMessages = useCallback(
    debounce(async (search: string, selectedPage: number) => {
      await fetchGovsgMessages(search, selectedPage)
    }, 300),
    []
  )

  const onModalConfirm = async (govsgMessage: GovsgMessage) => {
    await axios.post(`/campaign/${campaignId}/govsg/resend`, {
      govsg_message_id: govsgMessage.id,
    })
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
    void fetchGovsgMessages(search, selectedPage).finally(() => {
      setLoading(false)
    })
  }, [])

  const handlePageChange = (index: number) => {
    void fetchGovsgMessages(search, index)
  }

  const handleSearch = async (newSearch: string) => {
    setSearch(newSearch)
    await searchGovsgMessages(newSearch, 0)
  }

  const trackPasscodeReveal = useCallback(
    async (govsgMessage: GovsgMessage) => {
      await axios.post(`/campaign/${campaignId}/govsg/track-passcode-reveal`, {
        govsg_message_id: govsgMessage.id,
      })
    },
    []
  )

  const passcodeColumn = shouldHavePasscode
    ? [
        {
          name: 'PASSCODE',
          render: (govsgMessage: GovsgMessage) => {
            return (
              <PasscodeBadge
                key={govsgMessage.id}
                label={govsgMessage.passcode}
                placeholder="N/A"
                onClick={async () => await trackPasscodeReveal(govsgMessage)}
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
      ]
    : []

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
      width: 'sm',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          {name}
        </th>
      ),
    },
    ...passcodeColumn,
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
      width: 'xs',
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
        >
          <TextInput
            value={search}
            type="text"
            placeholder="Search for a message by recipient name or mobile number"
            onChange={handleSearch}
            iconLabel={
              <i className={cx('bx bx-search', overrideStylesTextInput.icon)} />
            }
            overrideStyles={overrideStylesTextInput}
          />
        </TitleBar>
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

  return loading ? <LoadingSpinner /> : renderGovsgMessage()
}
