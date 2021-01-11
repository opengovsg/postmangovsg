import React, { useEffect, useState, useContext, useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import cx from 'classnames'
import Moment from 'react-moment'
import { capitalize } from 'lodash'

import { ModalContext } from 'contexts/modal.context'
import { AuthContext } from 'contexts/auth.context'
import {
  Pagination,
  TitleBar,
  PrimaryButton,
  ExportRecipients,
} from 'components/common'
import { getCampaigns } from 'services/campaign.service'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'
import { Campaign, channelIcons, ChannelType, Status } from 'classes'
import CreateCampaign from 'components/dashboard/create/create-modal'

import EmptyDashboardImg from 'assets/img/empty-dashboard.svg'
import styles from './Campaigns.module.scss'

import DemoBar from 'components/dashboard/demo/demo-bar/DemoBar'
import CreateDemoModal from 'components/dashboard/demo/create-demo-modal'
import { getUserSettings } from 'services/settings.service'
import DuplicateCampaignModal from '../create/duplicate-campaign-modal'
import AnnouncementModal from './announcement-modal'
import { i18n } from 'locales'
import { ANNOUNCEMENT } from 'config'

const ITEMS_PER_PAGE = 10

const Campaigns = () => {
  const { email } = useContext(AuthContext)
  const modalContext = useContext(ModalContext)
  const [isLoading, setLoading] = useState(true)
  const [campaignsDisplayed, setCampaignsDisplayed] = useState(
    new Array<Campaign>()
  )
  const [selectedPage, setSelectedPage] = useState(0)
  const [campaignCount, setCampaignCount] = useState(0)
  const [isDemoDisplayed, setIsDemoDisplayed] = useState(false)
  const [numDemosSms, setNumDemosSms] = useState(0)
  const [numDemosTelegram, setNumDemosTelegram] = useState(0)
  const history = useHistory()
  const name = getNameFromEmail(email)
  const title = `Welcome, ${name}`

  function getNameFromEmail(email: string): string {
    const parts = email.split('@')
    const [nameParts] = parts
    return nameParts
      .split(/[_.-]/)
      .map((n) => capitalize(n))
      .join(' ')
  }

  async function fetchCampaigns(selectedPage: number) {
    setLoading(true)
    const { campaigns, totalCount } = await getCampaigns({
      offset: selectedPage * ITEMS_PER_PAGE,
      limit: ITEMS_PER_PAGE,
    })
    setCampaignCount(totalCount)
    setCampaignsDisplayed(campaigns)
    setLoading(false)
  }

  // Returns true if lastSeenVersion < currentPackageVersion, else false
  function compareSemver(
    lastSeenVersion: string,
    currentPackageVersion: string
  ) {
    if (!lastSeenVersion) {
      return true
    }
    const lastSeenSplit = lastSeenVersion
      .split('.')
      .map((num) => parseInt(num, 10))
    const currentSplit = currentPackageVersion
      .split('.')
      .map((num) => parseInt(num, 10))
    for (let i = 0; i < 3; i++) {
      if (lastSeenSplit[i] < currentSplit[i]) {
        return true
      }
      if (lastSeenSplit[i] > currentSplit[i]) {
        return false
      }
    }
    return false
  }

  // Only call the modalContext if content is currently null - prevents infinite re-rendering
  // Note that this triggers unnecessary network calls because useCallback evaluates the function being passed in
  const displayNewAnnouncement = useCallback(
    (userAnnouncementVersion: string) => {
      if (
        ANNOUNCEMENT.isActive &&
        compareSemver(userAnnouncementVersion, i18n._(ANNOUNCEMENT.version)) &&
        modalContext.modalContent === null
      ) {
        modalContext.setModalContent(<AnnouncementModal />)
      }
    },
    [modalContext]
  )

  useEffect(() => {
    fetchCampaigns(selectedPage)
  }, [selectedPage])

  useEffect(() => {
    // TODO: refactor out num demos processing
    async function getNumDemosAndAnnouncementVersion() {
      const { demo, announcementVersion } = await getUserSettings()
      setIsDemoDisplayed(demo?.isDisplayed)
      setNumDemosSms(demo?.numDemosSms)
      setNumDemosTelegram(demo?.numDemosTelegram)
      displayNewAnnouncement(announcementVersion)
    }
    getNumDemosAndAnnouncementVersion()
  }, [displayNewAnnouncement])

  /* eslint-disable react/display-name */
  const headers = [
    {
      name: 'Mode',
      render: (campaign: Campaign) => (
        <div className={styles.iconContainer}>
          <i
            className={cx(
              'bx',
              styles.icon,
              styles.mode,
              channelIcons[campaign.type]
            )}
          ></i>
          {campaign.protect && (
            <i className={cx('bx bxs-lock-alt', styles.lockIcon)}></i>
          )}
        </div>
      ),
      width: 'xs center',
    },
    {
      name: 'Name',
      render: (campaign: Campaign) => (
        <span
          className={cx({
            [styles.demo]: !!campaign.demoMessageLimit,
          })}
        >
          {campaign.name}
        </span>
      ),
      width: 'lg ellipsis',
    },
    {
      name: 'Created At',
      render: (campaign: Campaign) => (
        <Moment format="MMM DD YYYY, HH:mm">{campaign.createdAt}</Moment>
      ),
      width: 'md',
    },
    {
      name: 'Sent At',
      render: (campaign: Campaign) =>
        campaign.sentAt ? (
          <Moment format="MMM DD YYYY, HH:mm">{campaign.sentAt}</Moment>
        ) : (
          <span></span>
        ),
      width: 'md',
    },
    {
      name: 'Status',
      render: (campaign: Campaign) => capitalize(campaign.status),
      width: 'xs center',
    },
    {
      name: '',
      render: (campaign: Campaign) => {
        if (campaign.status === Status.Draft) return
        return (
          <ExportRecipients
            iconPosition="left"
            campaignId={campaign.id}
            campaignName={campaign.name}
            campaignType={campaign.type}
            sentAt={campaign.sentAt}
            status={campaign.status}
            statusUpdatedAt={campaign.statusUpdatedAt}
          />
        )
      },
      width: 'sm center',
    },
    {
      name: '',
      render: (campaign: Campaign) => {
        if (
          campaign.demoMessageLimit &&
          ((numDemosSms === 0 && campaign.type === ChannelType.SMS) ||
            (numDemosTelegram === 0 && campaign.type === ChannelType.Telegram))
        ) {
          return
        }
        return (
          <div
            className={cx(styles.iconContainer, styles.duplicate)}
            onClick={(event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
              event.stopPropagation()
              sendUserEvent(GA_USER_EVENTS.OPEN_DUPLICATE_MODAL, campaign.type)
              modalContext.setModalContent(
                <DuplicateCampaignModal campaign={campaign} />
              )
            }}
          >
            <i className={cx('bx bx-duplicate', styles.icon)}></i>{' '}
            <span>Duplicate</span>
          </div>
        )
      },
      width: 'sm center',
    },
  ]
  /* eslint-enable react/display-name */

  function renderRow(campaign: Campaign, key: number) {
    return (
      <tr key={key} onClick={() => history.push(`/campaigns/${campaign.id}`)}>
        {headers.map(({ render, width }, key) => (
          <td className={width} key={key}>
            {render(campaign)}
          </td>
        ))}
      </tr>
    )
  }

  function renderEmptyDashboard() {
    return (
      <div className={styles.emptyDashboard}>
        <img
          className={styles.image}
          src={EmptyDashboardImg}
          alt="Empty dashboard graphic"
        />
        <h2>We are excited to have you here!</h2>
        <p>There are 3 channels for you to try: Email, SMS and Telegram.</p>
        <p>
          Email is always free and no set up is required. Since Telegram and SMS
          requires more set-up, you can now try them out using demo campaigns to
          see how they work.
        </p>
        <div className={styles.actions}>
          <PrimaryButton
            onClick={() => {
              sendUserEvent(GA_USER_EVENTS.NEW_USER_TRY_EMAIL)
              modalContext.setModalContent(<CreateCampaign />)
            }}
          >
            Try email campaign
          </PrimaryButton>
          <PrimaryButton
            className={styles.darkGreenButton}
            onClick={() => {
              sendUserEvent(GA_USER_EVENTS.NEW_USER_TRY_SMS_TELEGRAM)
              modalContext.setModalContent(
                <CreateDemoModal
                  numDemosSms={numDemosSms}
                  numDemosTelegram={numDemosTelegram}
                />
              )
            }}
          >
            Try demo SMS/Telegram
          </PrimaryButton>
        </div>
      </div>
    )
  }

  function renderCampaignList() {
    return (
      <>
        <h2 className={styles.header}>{campaignCount} past campaigns</h2>
        <div className={styles.tableContainer}>
          <table className={styles.campaignTable}>
            <thead>
              <tr>
                {headers.map(({ name, width }, key) => (
                  <th className={width} key={key}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{campaignsDisplayed.map(renderRow)}</tbody>
          </table>
        </div>

        <Pagination
          itemsCount={campaignCount}
          selectedPage={selectedPage}
          setSelectedPage={setSelectedPage}
          itemsPerPage={ITEMS_PER_PAGE}
        ></Pagination>
      </>
    )
  }

  return (
    <>
      <TitleBar title={title}>
        <PrimaryButton
          onClick={() =>
            modalContext.setModalContent(<CreateCampaign></CreateCampaign>)
          }
        >
          Create new campaign
        </PrimaryButton>
      </TitleBar>
      {campaignCount > 0 && (
        <DemoBar
          numDemosSms={numDemosSms}
          numDemosTelegram={numDemosTelegram}
          isDisplayed={isDemoDisplayed}
        />
      )}
      <div className={styles.content}>
        {isLoading ? (
          <i className={cx(styles.spinner, 'bx bx-loader-alt bx-spin')}></i>
        ) : campaignCount > 0 ? (
          renderCampaignList()
        ) : (
          renderEmptyDashboard()
        )}
      </div>
    </>
  )
}

export default Campaigns
